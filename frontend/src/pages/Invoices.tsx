import { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  FileText, Plus, ArrowUpRight, ArrowDownLeft, 
  CheckCircle2, Clock, Calendar, Wallet 
} from 'lucide-react'

const API_URL = 'http://localhost:8000'

// --- 类型定义 ---
type Invoice = {
  id: number;
  title: string;
  project_name: string | null;
  inv_type: 'RECEIVABLE' | 'PAYABLE';
  status: 'UNPAID' | 'PARTIAL' | 'PAID';
  total_amount: number;
  paid_amount: number;
  due_date: string | null;
  created_at: string;
}

type Account = { id: number; name: string; balance: number; }
type Project = { id: number; name: string; }

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  
  // 视图过滤器: RECEIVABLE (应收) | PAYABLE (应付)
  const [viewType, setViewType] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE')

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isPayOpen, setIsPayOpen] = useState(false)
  const [selectedInv, setSelectedInv] = useState<Invoice | null>(null)

  // Forms
  const [createForm, setCreateForm] = useState({
    title: '',
    project_id: '',
    total_amount: '',
    due_date: '',
    inv_type: 'RECEIVABLE' // 默认值
  })

  const [payForm, setPayForm] = useState({
    account_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [invRes, accRes, projRes] = await Promise.all([
        axios.get(`${API_URL}/finance/invoices`),
        axios.get(`${API_URL}/finance/accounts`),
        axios.get(`${API_URL}/projects/`)
      ])
      setInvoices(invRes.data)
      setAccounts(accRes.data)
      setProjects(projRes.data)
    } catch (e) { console.error("加载失败", e) }
  }

  // 创建账单
  const handleCreate = async () => {
    if(!createForm.title || !createForm.total_amount) return alert("请补全信息")
    try {
      await axios.post(`${API_URL}/finance/invoices`, {
        ...createForm,
        inv_type: viewType, // 强制跟随当前视图类型
        project_id: createForm.project_id ? parseInt(createForm.project_id) : null,
        total_amount: parseFloat(createForm.total_amount),
        due_date: createForm.due_date || null
      })
      setIsCreateOpen(false)
      setCreateForm({ title: '', project_id: '', total_amount: '', due_date: '', inv_type: 'RECEIVABLE' })
      fetchData()
    } catch (e) { alert("创建失败") }
  }

  // 打开核销弹窗
  const openPayModal = (inv: Invoice) => {
    setSelectedInv(inv)
    // 自动填入剩余金额
    const remain = inv.total_amount - inv.paid_amount
    setPayForm({ ...payForm, amount: remain.toString() })
    setIsPayOpen(true)
  }

  // 提交核销
  const handlePay = async () => {
    if(!selectedInv || !payForm.account_id) return
    try {
      await axios.post(`${API_URL}/finance/invoices/${selectedInv.id}/pay`, {
        account_id: parseInt(payForm.account_id),
        amount: parseFloat(payForm.amount),
        payment_date: payForm.payment_date
      })
      setIsPayOpen(false)
      fetchData()
    } catch (e) { alert("核销失败，可能是余额不足") }
  }

  // 筛选当前视图的数据
  const currentList = invoices.filter(i => i.inv_type === viewType)
  
  // 计算统计数据
  const totalWait = currentList
    .filter(i => i.status !== 'PAID')
    .reduce((sum, i) => sum + (i.total_amount - i.paid_amount), 0)

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      
      {/* 顶部标题 */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <FileText className="text-indigo-600" size={32}/> 
            应收应付 (AR/AP)
          </h1>
          <p className="text-slate-500 mt-1">管理未结清的款项与债务</p>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus size={20}/> 新建单据
        </button>
      </div>

      {/* 视图切换 Tabs */}
      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setViewType('RECEIVABLE')}
          className={`flex-1 py-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2
            ${viewType === 'RECEIVABLE' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-transparent text-slate-400 hover:bg-white hover:shadow'}`}
        >
          <div className="flex items-center gap-2 text-lg font-bold">
            <ArrowDownLeft /> 应收账款 (别人欠我)
          </div>
          {viewType === 'RECEIVABLE' && <div className="text-2xl font-black">待收: ¥{totalWait.toLocaleString()}</div>}
        </button>

        <button 
          onClick={() => setViewType('PAYABLE')}
          className={`flex-1 py-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2
            ${viewType === 'PAYABLE' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-transparent text-slate-400 hover:bg-white hover:shadow'}`}
        >
          <div className="flex items-center gap-2 text-lg font-bold">
            <ArrowUpRight /> 应付账款 (我欠别人)
          </div>
          {viewType === 'PAYABLE' && <div className="text-2xl font-black">待付: ¥{totalWait.toLocaleString()}</div>}
        </button>
      </div>

      {/* 列表区域 */}
      <div className="space-y-4">
        {currentList.length === 0 && <div className="text-center text-gray-400 py-10">暂无相关单据</div>}
        
        {currentList.map(inv => {
          const progress = Math.min((inv.paid_amount / inv.total_amount) * 100, 100)
          const isDone = inv.status === 'PAID'

          return (
            <div key={inv.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              {/* 左侧信息 */}
              <div className="w-1/3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-lg text-slate-700">{inv.title}</span>
                  {inv.project_name && <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded">{inv.project_name}</span>}
                </div>
                <div className="text-sm text-slate-400 flex items-center gap-4">
                  <span className="flex items-center gap-1"><Clock size={14}/> 创建于 {inv.created_at.split('T')[0]}</span>
                  {inv.due_date && <span className="flex items-center gap-1 text-orange-400"><Calendar size={14}/> 截止 {inv.due_date}</span>}
                </div>
              </div>

              {/* 中间进度 */}
              <div className="w-1/3 px-8">
                <div className="flex justify-between text-sm mb-1 font-mono">
                  <span className="text-slate-500">已结: {Number(inv.paid_amount).toLocaleString()}</span>
                  <span className="text-slate-900 font-bold">总额: {Number(inv.total_amount).toLocaleString()}</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${isDone ? 'bg-green-500' : (viewType === 'RECEIVABLE' ? 'bg-blue-500' : 'bg-orange-500')}`} 
                    style={{width: `${progress}%`}}
                  ></div>
                </div>
              </div>

              {/* 右侧操作 */}
              <div>
                {isDone ? (
                  <span className="flex items-center gap-1 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-xl">
                    <CheckCircle2 size={20}/> 已结清
                  </span>
                ) : (
                  <button 
                    onClick={() => openPayModal(inv)}
                    className={`px-6 py-2 rounded-xl font-bold text-white shadow-md active:scale-95 transition-all
                      ${viewType === 'RECEIVABLE' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-500 hover:bg-orange-600'}`}
                  >
                    {viewType === 'RECEIVABLE' ? '收款核销' : '付款核销'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* --- 弹窗：新建单据 --- */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-[450px]">
            <h3 className="text-2xl font-bold mb-6 text-slate-700">
              {viewType === 'RECEIVABLE' ? '📝 新建应收单 (别人欠我)' : '📝 新建应付单 (我欠别人)'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">标题说明</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-indigo-500" 
                  placeholder={viewType === 'RECEIVABLE' ? "例: 万达项目首付款" : "例: 采购亚克力板材欠款"}
                  value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">总金额</label>
                <input type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-indigo-500 font-mono font-bold" 
                  placeholder="0.00"
                  value={createForm.total_amount} onChange={e => setCreateForm({...createForm, total_amount: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">关联项目 (可选)</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl outline-none"
                  value={createForm.project_id} onChange={e => setCreateForm({...createForm, project_id: e.target.value})}>
                  <option value="">-- 无 --</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">最晚付款日 (可选)</label>
                <input type="date" className="w-full p-3 bg-slate-50 rounded-xl outline-none" 
                  value={createForm.due_date} onChange={e => setCreateForm({...createForm, due_date: e.target.value})} />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">取消</button>
                <button onClick={handleCreate} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg">确认创建</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 弹窗：核销 --- */}
      {isPayOpen && selectedInv && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-[450px]">
            <h3 className="text-2xl font-bold mb-2 text-slate-700">
              {viewType === 'RECEIVABLE' ? '💰 确认收款' : '💸 确认付款'}
            </h3>
            <p className="text-slate-400 mb-6 text-sm">
              针对单据: <span className="font-bold text-slate-600">{selectedInv.title}</span>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  {viewType === 'RECEIVABLE' ? '收款存入账户' : '付款来源账户'}
                </label>
                <select className="w-full p-3 bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-indigo-500"
                  value={payForm.account_id} onChange={e => setPayForm({...payForm, account_id: e.target.value})}>
                  <option value="">-- 请选择 --</option>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} (余: {Number(acc.balance).toLocaleString()})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">本次核销金额</label>
                <input type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-indigo-500 font-mono font-bold text-lg" 
                  value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">日期</label>
                <input type="date" className="w-full p-3 bg-slate-50 rounded-xl outline-none" 
                  value={payForm.payment_date} onChange={e => setPayForm({...payForm, payment_date: e.target.value})} />
              </div>
              
              <div className="bg-yellow-50 text-yellow-700 p-3 rounded-xl text-xs flex gap-2 items-start mt-2">
                <Wallet size={16} className="mt-0.5"/>
                提示：点击确认后，系统会自动在财务流水中生成一笔{viewType === 'RECEIVABLE' ? '收入' : '支出'}记录，并更新账户余额。
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setIsPayOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">取消</button>
                <button onClick={handlePay} className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg ${viewType === 'RECEIVABLE' ? 'bg-blue-600' : 'bg-orange-500'}`}>确认核销</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}