import { useState } from 'react'
import axios from 'axios'
import { PackagePlus, PackageMinus, ScanLine, AlertCircle, CheckCircle2 } from 'lucide-react'
import InventoryModal from './components/InventoryModal'
import CreateMaterialModal from './components/CreateMaterialModal'
import { Settings } from 'lucide-react' // 引入一个小图标

// 定义后端 API 地址 (开发环境直接指向本机)
const API_URL = 'http://localhost:8000/inventory'

// 定义大按钮组件 (复用代码，体现工程化思维)
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

function App() {
  const [mode, setMode] = useState<'HOME' | 'SCAN'>('HOME')
  const [txnType, setTxnType] = useState<'IN' | 'OUT'>('OUT')
  const [materialId, setMaterialId] = useState<string>('1') // 默认物料ID 1
  const [qty, setQty] = useState<string>('')
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null)

  // ⬇️ 2. 新增状态：控制库存弹窗的开关
  const [isInventoryOpen, setIsInventoryOpen] = useState(false)
  const [isCreateMatOpen, setIsCreateMatOpen] = useState(false)

  // 提交数据给后端
  const handleSubmit = async () => {
    if (!qty) return
    try {
      // 调用我们在 FastAPI 里写的 scan 接口
      const res = await axios.post(`${API_URL}/scan`, {
        material_id: parseInt(materialId),
        txn_type: txnType,
        qty: parseFloat(qty),
        wo_id: null
      })
      
      // 成功反馈
      setStatus({ 
        type: 'success', 
        msg: `成功！当前库存: ${res.data.current_stock}` 
      })
      setQty('') // 清空输入框
      
      // 3秒后自动返回主页
      setTimeout(() => {
        setStatus(null)
        setMode('HOME')
      }, 3000)

    } catch (err: any) {
      console.error(err)
      setStatus({ 
        type: 'error', 
        msg: err.response?.data?.detail || '操作失败，请重试' 
      })
    }
  }

  // --- 界面渲染 ---

  // 1. 扫码/输入界面
  if (mode === 'SCAN') {
    return (
      <div className="p-6 h-screen flex flex-col bg-gray-100">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-700">
          {txnType === 'IN' ? '📦 正在入库' : '✂️ 正在领料'}
        </h1>
        
        {/* 反馈提示 */}
        {status && (
          <div className={`p-6 mb-6 rounded-2xl text-white text-2xl font-bold text-center animate-bounce ${status.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
            {status.type === 'success' ? <CheckCircle2 className="inline w-8 h-8 mr-2"/> : <AlertCircle className="inline w-8 h-8 mr-2"/>}
            {status.msg}
          </div>
        )}

        <div className="bg-white p-6 rounded-3xl shadow-sm flex-1 flex flex-col gap-6">
          
          {/* 模拟扫码：这里暂时用输入框代替，实际可用摄像头 */}
          <div>
            <label className="block text-xl text-gray-500 mb-2">物料 ID</label>
            <input 
              type="number" 
              value={materialId}
              onChange={e => setMaterialId(e.target.value)}
              className="w-full h-16 text-3xl text-center border-4 border-gray-200 rounded-xl focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xl text-gray-500 mb-2">数量</label>
            <input 
              type="number" 
              autoFocus
              value={qty}
              onChange={e => setQty(e.target.value)}
              className="w-full h-24 text-6xl font-bold text-center border-4 border-gray-200 rounded-xl focus:border-blue-500 outline-none"
            />
          </div>

          <button 
            onClick={handleSubmit}
            className="mt-auto w-full h-24 bg-blue-600 text-white text-3xl font-bold rounded-2xl shadow-lg active:scale-95 transition-transform"
          >
            确认提交
          </button>
          
          <button 
            onClick={() => setMode('HOME')}
            className="w-full h-16 text-gray-400 text-xl font-bold"
          >
            取消返回
          </button>
        </div>
      </div>
    )
  }

  // 2. 主页 (三个大按钮)
  return (
    <div className="p-6 h-screen bg-gray-100 flex flex-col justify-center">
      <h1 className="text-center text-3xl font-bold text-gray-400 mb-10">工厂作业终端</h1>
      
    <button 
    onClick={() => setIsCreateMatOpen(true)}
    className="absolute top-6 right-6 flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors"
  >
    <Settings size={20} />
    <span className="font-bold">录入物料</span>
  </button>

  <h1 className="...">工厂作业终端</h1>

      <BigButton 
        label="我要领料" 
        color="blue" 
        icon={<PackageMinus size={48} />}
        onClick={() => { setTxnType('OUT'); setMode('SCAN') }}
      />
      
      <BigButton 
        label="入库登记" 
        color="green" 
        icon={<PackagePlus size={48} />}
        onClick={() => { setTxnType('IN'); setMode('SCAN') }}
      />
      
      {/* ⬇️ 3. 修改这里：点击后打开弹窗状态 */}
      <BigButton 
        label="查库存" 
        color="red" 
        icon={<ScanLine size={48} />}
        onClick={() => setIsInventoryOpen(true)}
      />

      {/* ⬇️ 4. 挂载弹窗组件 */}
      <InventoryModal 
        open={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
      />

      {/* ⬇️ 新增：挂载创建物料弹窗 */}
      <CreateMaterialModal 
        open={isCreateMatOpen}
        onClose={() => setIsCreateMatOpen(false)}
  />

    </div>
  )
}

export default App