import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { 
    PackagePlus, PackageMinus, ScanLine, 
    AlertCircle, CheckCircle2, ArrowLeft, 
    ClipboardList, PlayCircle, CheckSquare, Trash2, RotateCcw,
    LogOut
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
      ${color === 'rose' ? 'bg-rose-600 border-rose-800 text-white' : ''} 
      ${color === 'amber' ? 'bg-amber-500 border-amber-700 text-white' : ''}
    `}
  >
    {icon}
    <span className="text-3xl font-black tracking-widest">{label}</span>
  </button>
)

export default function WorkerTerminal() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'HOME' | 'SCAN' | 'TASKS'>('HOME')
  // 🆕 新增 REWORK 类型
  const [txnType, setTxnType] = useState<'IN' | 'OUT' | 'SCRAP' | 'REWORK'>('OUT')
  
  const [materialId, setMaterialId] = useState<string>('')
  const [qty, setQty] = useState<string>('')
  
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [selectedWoId, setSelectedWoId] = useState<string>('')
  
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null)
  const [isInventoryOpen, setIsInventoryOpen] = useState(false)

  // 加载工单
  useEffect(() => {
    // 任何非 IN 模式，只要涉及到工单，都加载列表
    if (mode === 'TASKS' || (mode === 'SCAN' && txnType !== 'IN')) {
        fetchWorkOrders();
    }
  }, [mode, txnType]);

  const fetchWorkOrders = async () => {
      try {
          const res = await axios.get(`${API_URL}/work_orders/`);
          // 只显示未完成的
          const activeWos = res.data.filter((w:any) => w.status !== 'COMPLETED');
          setWorkOrders(activeWos);
      } catch (e) { console.error("加载工单失败"); }
  }

  const updateStatus = async (woId: number, newStatus: string) => {
      try {
          await axios.patch(`${API_URL}/work_orders/${woId}/status`, { status: newStatus });
          fetchWorkOrders();
          setStatus({ type: 'success', msg: `✅ 状态已更新` });
          setTimeout(() => setStatus(null), 1500);
      } catch (e: any) {
          const msg = e.response?.data?.detail || '更新失败';
          setStatus({ type: 'error', msg });
          setTimeout(() => setStatus(null), 3000);
      }
  }

  const handleSubmit = async () => {
    if (!qty) return // 数量必填
    // 如果不是 REWORK 且不是入库，必须有物料ID (返工是对工单操作，不需要扫物料码)
    if (txnType !== 'REWORK' && txnType !== 'IN' && !materialId) return
    
    // 如果不是入库，必须选工单
    if (txnType !== 'IN' && !selectedWoId) {
        setStatus({ type: 'error', msg: '⚠️ 请先选择关联的工单！' });
        return;
    }

    try {
      // 🆕 分支逻辑：如果是返工，调用的接口不一样
      if (txnType === 'REWORK') {
        await axios.post(`${API_URL}/work_orders/${selectedWoId}/rework`, {
            qty: parseInt(qty)
        });
        setStatus({ type: 'success', msg: `✅ 返工单已生成！请前往任务列表查看` });
      } else {
        // 原有库存/报废逻辑
        const res = await axios.post(`${API_URL}/inventory/scan`, {
            material_id: parseInt(materialId),
            txn_type: txnType,
            qty: parseFloat(qty),
            wo_id: txnType !== 'IN' ? parseInt(selectedWoId) : null 
        });
        const stockShow = res.data.current_stock !== undefined ? res.data.current_stock : '未知';
        setStatus({ type: 'success', msg: `✅ 提交成功！剩余库存: ${stockShow}` });
      }

      setQty('')
      setMaterialId('')
      setTimeout(() => setStatus(null), 3000)

    } catch (err: any) {
      console.error("提交报错:", err);
      let errorMsg = '操作失败';
      const detail = err.response?.data?.detail;
      if (detail) {
          if (typeof detail === 'string') errorMsg = detail;
          else if (Array.isArray(detail)) errorMsg = detail.map((item: any) => item.msg).join('; ');
          else errorMsg = JSON.stringify(detail);
      }
      setStatus({ type: 'error', msg: errorMsg });
    }
  }

  // --- TASKS 模式 ---
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
                            <div className="text-sm text-gray-400 font-bold flex items-center gap-2">
                                WO #{wo.id}
                                {/* 如果是返工单，显示特殊标签 */}
                                {wo.wo_type === 'REWORK' && (
                                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs border border-amber-200 flex items-center gap-1">
                                      <RotateCcw size={12}/> 返工
                                </span>
                                )}
                            </div>
                            {/* 🆕 优化 2: 如果有父工单，显示来源 */}
                            {wo.parent_id && (
                                <div className="text-xs text-gray-400 mt-1">
                                    ↳ 来源: 原工单 #{wo.parent_id}
                                </div>
                            )}
                            <div className="text-xl font-bold text-slate-800">{wo.project_name}</div>
                            <div className="mt-1 text-sm text-gray-500">计划数量: {wo.qty}</div>
                            <div className="mt-1">
                                {wo.status === 'PLANNED' && <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm font-bold">🕒 待开工</span>}
                                {wo.status === 'IN_PROGRESS' && <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-sm font-bold animate-pulse">🔥 进行中</span>}
                            </div>
                        </div>
                        <div>
                            {wo.status === 'PLANNED' && (
                                <button onClick={() => updateStatus(wo.id, 'IN_PROGRESS')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg active:scale-95 flex items-center gap-2">
                                    <PlayCircle /> 开工
                                </button>
                            )}
                            {wo.status === 'IN_PROGRESS' && (
                                <button onClick={() => updateStatus(wo.id, 'COMPLETED')} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg active:scale-95 flex items-center gap-2">
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

  // --- SCAN 扫码作业界面 ---
  if (mode === 'SCAN') {
    let bgColor = 'bg-slate-100';
    let titleColor = 'text-gray-700';
    if (txnType === 'SCRAP') { bgColor = 'bg-rose-50'; titleColor = 'text-rose-700'; }
    if (txnType === 'REWORK') { bgColor = 'bg-amber-50'; titleColor = 'text-amber-700'; }

    return (
      <div className={`p-4 h-screen flex flex-col ${bgColor}`}>
        <div className="flex items-center mb-4">
            <button onClick={() => setMode('HOME')} className="p-2 bg-white rounded-xl shadow text-gray-600">
                <ArrowLeft size={32}/>
            </button>
            <h1 className={`text-2xl font-bold ml-4 flex-1 text-center ${titleColor}`}>
                {txnType === 'IN' && '📦 原材料入库'}
                {txnType === 'OUT' && '🛠️ 生产领料'}
                {txnType === 'SCRAP' && '🗑️ 登记次品'}
                {txnType === 'REWORK' && '🔧 申请返工'}
            </h1>
            <div className="w-12"></div>
        </div>
        
        {status && (
          <div className={`p-4 mb-4 rounded-xl text-white text-xl font-bold text-center animate-bounce ${status.type === 'success' ? 'bg-green-600' : 'bg-red-500'}`}>
            {status.msg}
          </div>
        )}

        <div className="bg-white p-4 rounded-3xl shadow-sm flex-1 flex flex-col gap-4 overflow-y-auto">
          
          {/* 非入库操作，都需要选工单 */}
          {txnType !== 'IN' && (
              <div className={`p-4 rounded-2xl border-2 ${txnType === 'REWORK' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'}`}>
                  <label className={`block text-lg font-bold mb-2 ${txnType === 'REWORK' ? 'text-amber-800' : 'text-blue-800'}`}>
                      {txnType === 'REWORK' ? '🛠️ 选择需要返工的工单' : '🏷️ 关联工单'}
                  </label>
                  <select 
                    className="w-full h-16 text-xl bg-white border-2 border-gray-200 rounded-xl px-4 outline-none focus:border-blue-500"
                    value={selectedWoId}
                    onChange={e => setSelectedWoId(e.target.value)}
                  >
                      <option value="">-- 请选择 --</option>
                      {workOrders.map(wo => (
                          <option key={wo.id} value={wo.id}>
                              #{wo.id} {wo.project_name} ({wo.status})
                          </option>
                      ))}
                  </select>
              </div>
          )}

          {/* 返工不需要扫物料码，因为是对工单的操作 */}
          {txnType !== 'REWORK' && (
            <div>
                <label className="block text-lg text-gray-500 mb-1">物料 ID</label>
                <input type="number" value={materialId} onChange={e => setMaterialId(e.target.value)} className="w-full h-16 text-3xl text-center border-4 border-gray-200 rounded-xl focus:border-blue-500 outline-none" placeholder="扫码" />
            </div>
          )}
          
          <div>
            <label className="block text-lg text-gray-500 mb-1">数量</label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} className="w-full h-20 text-5xl font-bold text-center border-4 border-gray-200 rounded-xl focus:border-blue-500 outline-none" placeholder="0" />
          </div>

          <button 
            onClick={handleSubmit}
            className={`mt-auto w-full h-24 text-white text-3xl font-bold rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3 
                ${txnType === 'SCRAP' ? 'bg-rose-600' : (txnType === 'REWORK' ? 'bg-amber-500' : 'bg-blue-600')}`}
          >
            {txnType === 'REWORK' ? <RotateCcw size={32} /> : (txnType === 'SCRAP' ? <Trash2 size={32} /> : <CheckCircle2 size={32} />)}
            {txnType === 'REWORK' ? '生成返工单' : '确认提交'}
          </button>
        </div>
      </div>
    )
  }

  // --- HOME ---
  return (

    <div className="p-6 h-screen bg-gray-100 flex flex-col relative">
    
    {/* 顶部标题栏 + 退出按钮 */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-500">🏭 工厂作业终端</h1>
      
      {/* 退出按钮 */}
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-600 rounded-xl font-bold active:scale-95 transition"
        >
          <LogOut size={20} /> 退出
        </button>
      </div>

      <BigButton label="生产任务" color="orange" icon={<ClipboardList size={40} />} onClick={() => setMode('TASKS')} />
      <div className="h-4"></div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <BigButton label="领料" color="blue" icon={<PackageMinus size={40} />} onClick={() => { setTxnType('OUT'); setMode('SCAN') }} />
        <BigButton label="入库" color="green" icon={<PackagePlus size={40} />} onClick={() => { setTxnType('IN'); setMode('SCAN') }} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <BigButton label="登记次品" color="rose" icon={<Trash2 size={40} />} onClick={() => { setTxnType('SCRAP'); setMode('SCAN') }} />
        {/* 🆕 返工入口 */}
        <BigButton label="申请返工" color="amber" icon={<RotateCcw size={40} />} onClick={() => { setTxnType('REWORK'); setMode('SCAN') }} />
      </div>
      
      <BigButton label="查库存" color="red" icon={<ScanLine size={40} />} onClick={() => setIsInventoryOpen(true)} />
      <InventoryModal open={isInventoryOpen} onClose={() => setIsInventoryOpen(false)} />
    </div>
  )
}