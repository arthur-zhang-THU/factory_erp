import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { 
    PackagePlus, PackageMinus, ScanLine, 
    AlertCircle, CheckCircle2, ArrowLeft, 
    ClipboardList, PlayCircle, CheckSquare, Trash2, RotateCcw,
    LogOut
} from 'lucide-react'
import { message } from 'antd' // 引入 message 组件做轻提示
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
  const [txnType, setTxnType] = useState<'IN' | 'OUT' | 'SCRAP' | 'REWORK'>('OUT')
  
  const [materialId, setMaterialId] = useState<string>('')
  const [qty, setQty] = useState<string>('')
  
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [selectedWoId, setSelectedWoId] = useState<string>('')
  
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null)
  const [isInventoryOpen, setIsInventoryOpen] = useState(false)

  // 获取当前登录用户名
  const currentUsername = localStorage.getItem('user')

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

  // 提交扫码操作 (入库/领料/报废/返工)
  const handleSubmit = async () => {
    if (!qty) return // 数量必填
    
    // 校验逻辑
    if (txnType !== 'REWORK' && txnType !== 'IN' && !materialId) return
    if (txnType !== 'IN' && !selectedWoId) {
        setStatus({ type: 'error', msg: '⚠️ 请先选择关联的工单！' });
        return;
    }

    try {
      if (txnType === 'REWORK') {
        await axios.post(`${API_URL}/work_orders/${selectedWoId}/rework`, {
            qty: parseInt(qty)
        });
        setStatus({ type: 'success', msg: `✅ 返工单已生成！` });
      } else {
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

  // --- 🆕 TASKS 模式 (工序流转版) ---
  if (mode === 'TASKS') {
      return (
        <div className="p-4 h-screen flex flex-col bg-slate-100">
            {/* 顶部标题 */}
            <div className="flex items-center mb-4">
                <button onClick={() => setMode('HOME')} className="p-2 bg-white rounded-xl shadow text-gray-600">
                    <ArrowLeft size={32}/>
                </button>
                <h1 className="text-2xl font-bold ml-4 text-gray-700">📋 我的工序任务</h1>
            </div>

            {/* 状态提示 */}
            {status && (
                <div className={`p-4 mb-4 rounded-xl text-white text-xl font-bold text-center animate-bounce ${status.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {status.msg}
                </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-4">
                {/* 遍历所有工单，寻找属于当前工人的工序 */}
                {workOrders.map(wo => {
                    // 🔍 核心逻辑 1: 找到状态为 PENDING (待办) 的步骤
                    const currentStep = wo.steps?.find((s: any) => s.status === 'PENDING');

                    // 🔍 核心逻辑 2: 过滤任务
                    // 如果没步骤、或者步骤指派了人但不是我，都不显示
                    if (!currentStep) return null;
                    if (currentStep.assigned_user && currentStep.assigned_user.username !== currentUsername) {
                        return null;
                    }

                    return (
                        <div key={wo.id} className="bg-white p-5 rounded-2xl shadow-sm border-l-8 border-blue-500">
                            <div className="flex justify-between items-start mb-2">
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                                    WO #{wo.id}
                                </span>
                                <span className="text-xs text-gray-400">{wo.planned_end} 交付</span>
                            </div>
                            
                            <h3 className="text-xl font-black text-slate-800 mb-1">{wo.project_name}</h3>
                            
                            {/* 当前工序卡片 */}
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mt-2 flex justify-between items-center">
                                <div>
                                    <div className="text-xs text-yellow-600 font-bold uppercase mb-1">当前工序</div>
                                    <div className="text-3xl font-black text-yellow-800 flex items-center gap-2">
                                        <PlayCircle size={28}/> {currentStep.name}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {currentStep.assigned_user ? `👤 指派给: ${currentStep.assigned_user.username}` : '🌐 公共任务池'}
                                    </div>
                                </div>
                                
                                {/* ✅ 完工按钮 (触发流转) */}
                                <button 
                                    onClick={async () => {
                                        try {
                                            // 调用后端 complete 接口
                                            await axios.post(`${API_URL}/work_orders/steps/${currentStep.id}/complete`);
                                            setStatus({ type: 'success', msg: '✅ 工序完成！已流转到下一步' });
                                            fetchWorkOrders(); // 刷新列表，任务应该会消失
                                        } catch(e) {
                                            setStatus({ type: 'error', msg: '提交失败，请重试' });
                                        }
                                    }}
                                    className="bg-green-500 text-white h-16 px-6 rounded-2xl font-bold shadow-lg active:scale-95 flex items-center gap-2 border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all"
                                >
                                    <CheckSquare size={24}/> 完工打卡
                                </button>
                            </div>
                        </div>
                    );
                })}
                
                {/* 如果过滤完列表是空的 */}
                <div className="text-center text-gray-400 mt-20">
                    <div className="text-6xl mb-4">🍵</div>
                    <p>当前没有待办工序</p>
                    <p className="text-sm mt-2">休息一下，或者去帮别人</p>
                </div>
            </div>
        </div>
      )
  }

  // --- SCAN 扫码作业界面 (保持不变) ---
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

          {/* 返工不需要扫物料码 */}
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-500">🏭 工厂作业终端</h1>
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
        <BigButton label="申请返工" color="amber" icon={<RotateCcw size={40} />} onClick={() => { setTxnType('REWORK'); setMode('SCAN') }} />
      </div>
      
      <BigButton label="查库存" color="red" icon={<ScanLine size={40} />} onClick={() => setIsInventoryOpen(true)} />
      <InventoryModal open={isInventoryOpen} onClose={() => setIsInventoryOpen(false)} />
    </div>
  )
}