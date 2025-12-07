import { useState, useEffect } from 'react'
import axios from 'axios'
import { 
    PackagePlus, PackageMinus, ScanLine, 
    AlertCircle, CheckCircle2, ArrowLeft, 
    ClipboardList, PlayCircle, CheckSquare 
} from 'lucide-react'
import InventoryModal from '../components/InventoryModal'

const API_URL = 'http://localhost:8000'

// 复用的大按钮组件
const BigButton = ({ label, color, icon, onClick }: any) => (
  <button
    onClick={onClick}
    className={`
      w-full h-32 mb-4 rounded-3xl shadow-lg border-b-8 active:border-b-0 active:translate-y-2 transition-all
      flex items-center justify-center gap-4
      ${color === 'green' ? 'bg-green-500 border-green-700 text-white' : ''}
      ${color === 'blue' ? 'bg-blue-500 border-blue-700 text-white' : ''}
      ${color === 'red' ? 'bg-red-500 border-red-700 text-white' : ''}
      ${color === 'orange' ? 'bg-orange-500 border-orange-700 text-white' : ''}
    `}
  >
    {icon}
    <span className="text-3xl font-black tracking-widest">{label}</span>
  </button>
)

export default function WorkerTerminal() {
  // 🆕 新增 TASKS 模式
  const [mode, setMode] = useState<'HOME' | 'SCAN' | 'TASKS'>('HOME')
  const [txnType, setTxnType] = useState<'IN' | 'OUT'>('OUT')
  
  // 扫码相关
  const [materialId, setMaterialId] = useState<string>('')
  const [qty, setQty] = useState<string>('')
  
  // 工单数据
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [selectedWoId, setSelectedWoId] = useState<string>('')
  
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null)
  const [isInventoryOpen, setIsInventoryOpen] = useState(false)

  // 加载工单 (用于任务列表 或 领料下拉框)
  useEffect(() => {
    if (mode === 'TASKS' || (mode === 'SCAN' && txnType === 'OUT')) {
        fetchWorkOrders();
    }
  }, [mode, txnType]);

  const fetchWorkOrders = async () => {
      try {
          const res = await axios.get(`${API_URL}/work_orders/`);
          // 过滤掉已完成的，只显示待办和进行中
          const activeWos = res.data.filter((w:any) => w.status !== 'COMPLETED');
          setWorkOrders(activeWos);
      } catch (e) { console.error("加载工单失败"); }
  }

  // 状态流转 (专门给 TASKS 模式用)
  const updateStatus = async (woId: number, newStatus: string) => {
      try {
          await axios.patch(`${API_URL}/work_orders/${woId}/status`, { status: newStatus });
          fetchWorkOrders(); // 刷新列表
          setStatus({ type: 'success', msg: `✅ 状态已更新` });
          setTimeout(() => setStatus(null), 1500);
      } catch (e: any) {
          const msg = e.response?.data?.detail || '更新失败';
          setStatus({ type: 'error', msg });
          setTimeout(() => setStatus(null), 3000);
      }
  }

  // 提交库存变动
  const handleSubmit = async () => {
    if (!qty || !materialId) return
    
    if (txnType === 'OUT' && !selectedWoId) {
        setStatus({ type: 'error', msg: '⚠️ 请先选择关联的工单！' });
        return;
    }

    try {
      const res = await axios.post(`${API_URL}/inventory/scan`, {
        material_id: parseInt(materialId),
        txn_type: txnType,
        qty: parseFloat(qty),
        wo_id: txnType === 'OUT' ? parseInt(selectedWoId) : null 
      })
      
      setStatus({ type: 'success', msg: `✅ 成功！剩余库存: ${res.data.current_stock}` })
      setQty('')
      setMaterialId('')
      setTimeout(() => setStatus(null), 3000)
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.response?.data?.detail || '操作失败' })
    }
  }

  // --- 1. 任务管理界面 (新功能) ---
  if (mode === 'TASKS') {
      return (
        <div className="p-4 h-screen flex flex-col bg-slate-100">
            <div className="flex items-center mb-4">
                <button onClick={() => setMode('HOME')} className="p-2 bg-white rounded-xl shadow text-gray-600">
                    <ArrowLeft size={32}/>
                </button>
                <h1 className="text-2xl font-bold ml-4 text-gray-700">📋 我的生产任务</h1>
            </div>

            {status && (
                <div className={`p-4 mb-4 rounded-xl text-white text-xl font-bold text-center ${status.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {status.msg}
                </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-4">
                {workOrders.length === 0 && <div className="text-center text-gray-400 mt-10">暂无待办任务</div>}
                
                {workOrders.map(wo => (
                    <div key={wo.id} className="bg-white p-5 rounded-2xl shadow-sm border-l-8 border-blue-500 flex justify-between items-center">
                        <div>
                            <div className="text-sm text-gray-400 font-bold">WO #{wo.id}</div>
                            <div className="text-xl font-bold text-slate-800">{wo.project_name}</div>
                            <div className="mt-1">
                                {wo.status === 'PLANNED' && <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm font-bold">🕒 待开工</span>}
                                {wo.status === 'IN_PROGRESS' && <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-sm font-bold animate-pulse">🔥 进行中</span>}
                            </div>
                        </div>

                        {/* 操作按钮区 */}
                        <div>
                            {wo.status === 'PLANNED' && (
                                <button 
                                    onClick={() => updateStatus(wo.id, 'IN_PROGRESS')}
                                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg active:scale-95 flex items-center gap-2"
                                >
                                    <PlayCircle /> 开工
                                </button>
                            )}
                            {wo.status === 'IN_PROGRESS' && (
                                <button 
                                    onClick={() => updateStatus(wo.id, 'COMPLETED')}
                                    className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg active:scale-95 flex items-center gap-2"
                                >
                                    <CheckSquare /> 完工
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )
  }

  // --- 2. 扫码作业界面 (纯净版) ---
  if (mode === 'SCAN') {
    return (
      <div className="p-4 h-screen flex flex-col bg-slate-100">
        <div className="flex items-center mb-4">
            <button onClick={() => setMode('HOME')} className="p-2 bg-white rounded-xl shadow text-gray-600">
                <ArrowLeft size={32}/>
            </button>
            <h1 className="text-2xl font-bold ml-4 text-gray-700 flex-1 text-center">
            {txnType === 'IN' ? '📦 原材料入库' : '🛠️ 生产领料'}
            </h1>
            <div className="w-12"></div>
        </div>
        
        {status && (
          <div className={`p-4 mb-4 rounded-xl text-white text-xl font-bold text-center animate-bounce ${status.type === 'success' ? 'bg-green-600' : 'bg-red-500'}`}>
            {status.msg}
          </div>
        )}

        <div className="bg-white p-4 rounded-3xl shadow-sm flex-1 flex flex-col gap-4 overflow-y-auto">
          
          {/* 领料时选工单，但不再有“开工”按钮，纯粹做选择 */}
          {txnType === 'OUT' && (
              <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100">
                  <label className="block text-lg font-bold text-blue-800 mb-2">🏷️ 选择关联工单</label>
                  <select 
                    className="w-full h-16 text-xl bg-white border-2 border-blue-200 rounded-xl px-4 outline-none focus:border-blue-500"
                    value={selectedWoId}
                    onChange={e => setSelectedWoId(e.target.value)}
                  >
                      <option value="">-- 请选择 --</option>
                      {workOrders.map(wo => (
                          <option key={wo.id} value={wo.id}>
                              #{wo.id} {wo.project_name} ({wo.status === 'IN_PROGRESS' ? '进行中' : '待开工'})
                          </option>
                      ))}
                  </select>
              </div>
          )}

          <div>
            <label className="block text-lg text-gray-500 mb-1">物料 ID</label>
            <input 
                type="number" 
                value={materialId} 
                onChange={e => setMaterialId(e.target.value)} 
                className="w-full h-16 text-3xl text-center border-4 border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                placeholder="扫码或输入"
            />
          </div>
          
          <div>
            <label className="block text-lg text-gray-500 mb-1">数量</label>
            <input 
                type="number" 
                value={qty} 
                onChange={e => setQty(e.target.value)} 
                className="w-full h-20 text-5xl font-bold text-center border-4 border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                placeholder="0"
            />
          </div>

          <button 
            onClick={handleSubmit}
            className="mt-auto w-full h-24 bg-blue-600 text-white text-3xl font-bold rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3"
          >
            <CheckCircle2 size={32} /> 确认提交
          </button>
        </div>
      </div>
    )
  }

  // --- 3. 主页 ---
  return (
    <div className="p-6 h-screen bg-gray-100 flex flex-col justify-center relative">
      <h1 className="text-center text-3xl font-bold text-gray-400 mb-8">🏭 工厂作业终端</h1>
      
      {/* 🆕 新入口：生产任务 */}
      <BigButton 
        label="生产任务" 
        color="orange" 
        icon={<ClipboardList size={40} />} 
        onClick={() => setMode('TASKS')} 
      />

      <div className="h-4"></div> {/* 间隔 */}

      <BigButton label="我要领料" color="blue" icon={<PackageMinus size={40} />} onClick={() => { setTxnType('OUT'); setMode('SCAN') }} />
      <BigButton label="入库登记" color="green" icon={<PackagePlus size={40} />} onClick={() => { setTxnType('IN'); setMode('SCAN') }} />
      <BigButton label="查库存" color="red" icon={<ScanLine size={40} />} onClick={() => setIsInventoryOpen(true)} />
      
      <InventoryModal open={isInventoryOpen} onClose={() => setIsInventoryOpen(false)} />
    </div>
  )
}