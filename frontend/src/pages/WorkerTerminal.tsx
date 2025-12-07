import { useState } from 'react'
import axios from 'axios'
import { PackagePlus, PackageMinus, ScanLine, AlertCircle, CheckCircle2 } from 'lucide-react'
// 注意路径变化：现在要往上跳一级找 components
import InventoryModal from '../components/InventoryModal'

const API_URL = 'http://localhost:8000/inventory'

const BigButton = ({ label, color, icon, onClick }: any) => (
  <button
    onClick={onClick}
    className={`
      w-full h-40 mb-6 rounded-3xl shadow-lg border-b-8 active:border-b-0 active:translate-y-2 transition-all
      flex flex-col items-center justify-center gap-2
      ${color === 'green' ? 'bg-green-500 border-green-700 text-white' : ''}
      ${color === 'blue' ? 'bg-blue-500 border-blue-700 text-white' : ''}
      ${color === 'red' ? 'bg-red-500 border-red-700 text-white' : ''}
    `}
  >
    {icon}
    <span className="text-4xl font-black tracking-widest">{label}</span>
  </button>
)

export default function WorkerTerminal() {
  const [mode, setMode] = useState<'HOME' | 'SCAN'>('HOME')
  const [txnType, setTxnType] = useState<'IN' | 'OUT'>('OUT')
  const [materialId, setMaterialId] = useState<string>('1')
  const [qty, setQty] = useState<string>('')
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null)
  const [isInventoryOpen, setIsInventoryOpen] = useState(false)

  const handleSubmit = async () => {
    if (!qty) return
    try {
      const res = await axios.post(`${API_URL}/scan`, {
        material_id: parseInt(materialId),
        txn_type: txnType,
        qty: parseFloat(qty),
        wo_id: null
      })
      setStatus({ type: 'success', msg: `成功！库存: ${res.data.current_stock}` })
      setQty('')
      setTimeout(() => { setStatus(null); setMode('HOME') }, 3000)
    } catch (err: any) {
      console.error(err)
      setStatus({ type: 'error', msg: err.response?.data?.detail || '操作失败' })
    }
  }

  if (mode === 'SCAN') {
    return (
      <div className="p-6 h-screen flex flex-col bg-gray-100">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-700">
          {txnType === 'IN' ? '📦 正在入库' : '✂️ 正在领料'}
        </h1>
        {status && (
          <div className={`p-6 mb-6 rounded-2xl text-white text-2xl font-bold text-center animate-bounce ${status.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
            {status.type === 'success' ? <CheckCircle2 className="inline w-8 h-8 mr-2"/> : <AlertCircle className="inline w-8 h-8 mr-2"/>}
            {status.msg}
          </div>
        )}
        <div className="bg-white p-6 rounded-3xl shadow-sm flex-1 flex flex-col gap-6">
          <div>
            <label className="block text-xl text-gray-500 mb-2">物料 ID</label>
            <input type="number" value={materialId} onChange={e => setMaterialId(e.target.value)} className="w-full h-16 text-3xl text-center border-4 border-gray-200 rounded-xl focus:border-blue-500 outline-none"/>
          </div>
          <div>
            <label className="block text-xl text-gray-500 mb-2">数量</label>
            <input type="number" autoFocus value={qty} onChange={e => setQty(e.target.value)} className="w-full h-24 text-6xl font-bold text-center border-4 border-gray-200 rounded-xl focus:border-blue-500 outline-none"/>
          </div>
          <button onClick={handleSubmit} className="mt-auto w-full h-24 bg-blue-600 text-white text-3xl font-bold rounded-2xl shadow-lg active:scale-95 transition-transform">确认提交</button>
          <button onClick={() => setMode('HOME')} className="w-full h-16 text-gray-400 text-xl font-bold">取消返回</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 h-screen bg-gray-100 flex flex-col justify-center">
      <h1 className="text-center text-3xl font-bold text-gray-400 mb-10">工厂作业终端</h1>
      <BigButton label="我要领料" color="blue" icon={<PackageMinus size={48} />} onClick={() => { setTxnType('OUT'); setMode('SCAN') }} />
      <BigButton label="入库登记" color="green" icon={<PackagePlus size={48} />} onClick={() => { setTxnType('IN'); setMode('SCAN') }} />
      <BigButton label="查库存" color="red" icon={<ScanLine size={48} />} onClick={() => setIsInventoryOpen(true)} />
      <InventoryModal open={isInventoryOpen} onClose={() => setIsInventoryOpen(false)} />
    </div>
  )
}