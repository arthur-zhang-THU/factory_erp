import { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  Wallet, TrendingUp, TrendingDown, Plus, 
  ArrowRightLeft, Landmark, Calendar, FileText 
} from 'lucide-react'

const API_URL = 'http://localhost:8000'

// --- 类型定义 ---
type Account = {
  id: number;
  name: string;
  balance: number;
}

type Transaction = {
  id: number;
  account_name: string;
  project_name: string | null;
  txn_type: 'INCOME' | 'EXPENSE';
  category: string;
  amount: number;
  description: string;
  txn_date: string;
}

// 简单的分类映射 (显示中文用)
const CategoryMap: Record<string, string> = {
  SALES: "💰 销售回款",
  OTHER_IN: "📈 其他收入",
  PROCUREMENT: "🧱 采购原料",
  SALARY: "👷 工人工资",
  RENT: "🏠 房租水电",
  LOGISTICS: "🚚 物流运费",
  MEALS: "🍱 伙食招待",
  OTHER_OUT: "💸 其他支出"
}

export default function Finance() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [projects, setProjects] = useState<any[]>([])
  
  // Modals state
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false)
  const [isAccModalOpen, setIsAccModalOpen] = useState(false)

  // Form Data
  const [newAccName, setNewAccName] = useState('')
  const [newAccBal, setNewAccBal] = useState('')
  
  const [txnForm, setTxnForm] = useState({
    account_id: '',
    project_id: '',
    txn_type: 'EXPENSE', // 默认支出
    category: 'PROCUREMENT',
    amount: '',
    description: '',
    txn_date: new Date().toISOString().split('T')[0] // 默认今天
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [accRes, txnRes, projRes] = await Promise.all([
        axios.get(`${API_URL}/finance/accounts`),
        axios.get(`${API_URL}/finance/transactions`),
        axios.get(`${API_URL}/projects/`) // 假设你之前有这个接口
      ])
      setAccounts(accRes.data)
      setTransactions(txnRes.data)
      setProjects(projRes.data)
    } catch (e) { console.error("加载财务数据失败", e) }
  }

  const handleCreateAccount = async () => {
    if(!newAccName) return;
    try {
      await axios.post(`${API_URL}/finance/accounts`, {
        name: newAccName,
        initial_balance: parseFloat(newAccBal) || 0
      })
      setIsAccModalOpen(false)
      setNewAccName('')
      setNewAccBal('')
      fetchData() // 刷新
    } catch (e) { alert('创建失败') }
  }

  const handleRecordTxn = async () => {
    if(!txnForm.amount || !txnForm.account_id) return alert("请填写金额和账户");
    
    try {
      await axios.post(`${API_URL}/finance/transactions`, {
        ...txnForm,
        amount: parseFloat(txnForm.amount),
        account_id: parseInt(txnForm.account_id),
        project_id: txnForm.project_id ? parseInt(txnForm.project_id) : null
      })
      setIsTxnModalOpen(false)
      // 重置表单但保留日期
      setTxnForm({ ...txnForm, amount: '', description: '' }) 
      fetchData()
    } catch (e) { alert('记账失败') }
  }

  // 计算总资产
  const totalAssets = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      
      {/* 顶部：标题与总览 */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Landmark className="text-blue-600" size={32}/> 
            企业资金看板
          </h1>
          <p className="text-slate-500 mt-1">管理公司的每一个铜板</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400">当前总资产</div>
          <div className="text-4xl font-black text-slate-800">
            ¥ {totalAssets.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* 账户卡片区域 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* 新增账户按钮 */}
        <button 
          onClick={() => setIsAccModalOpen(true)}
          className="h-32 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all bg-white"
        >
          <Plus size={32} />
          <span className="font-bold mt-2">开立新账户</span>
        </button>

        {/* 现有账户列表 */}
        {accounts.map(acc => (
          <div key={acc.id} className="h-32 bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform"></div>
            <div className="relative z-10 text-slate-500 font-bold flex items-center gap-2">
              <Wallet size={18}/> {acc.name}
            </div>
            <div className="relative z-10 text-2xl font-bold text-slate-800">
              ¥ {Number(acc.balance).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* 交易流水区域 */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <ArrowRightLeft className="text-slate-400"/> 收支明细
          </h2>
          <button 
            onClick={() => setIsTxnModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
          >
            <FileText size={20}/> 记一笔
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <th className="pb-3 pl-4 font-medium">日期</th>
                <th className="pb-3 font-medium">类型</th>
                <th className="pb-3 font-medium">关联项目</th>
                <th className="pb-3 font-medium">说明</th>
                <th className="pb-3 font-medium">账户</th>
                <th className="pb-3 pr-4 text-right font-medium">金额</th>
              </tr>
            </thead>
            <tbody className="text-slate-600">
              {transactions.map(txn => (
                <tr key={txn.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-4 pl-4 font-mono text-sm text-slate-400">{txn.txn_date}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${txn.txn_type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {CategoryMap[txn.category] || txn.category}
                    </span>
                  </td>
                  <td className="py-4">
                    {txn.project_name ? (
                      <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold">
                        {txn.project_name}
                      </span>
                    ) : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="py-4 text-sm">{txn.description}</td>
                  <td className="py-4 text-sm text-slate-500">{txn.account_name}</td>
                  <td className={`py-4 pr-4 text-right font-bold font-mono text-lg ${txn.txn_type === 'INCOME' ? 'text-green-600' : 'text-slate-800'}`}>
                    {txn.txn_type === 'INCOME' ? '+' : '-'}{Number(txn.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">暂无账单记录</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- 弹窗：开户 --- */}
      {isAccModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-96 animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-bold mb-6">🏦 开立新账户</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">账户名称</label>
                <input placeholder="例: 建行基本户" className="w-full p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none" 
                  value={newAccName} onChange={e => setNewAccName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">初始余额</label>
                <input type="number" placeholder="0.00" className="w-full p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none"
                  value={newAccBal} onChange={e => setNewAccBal(e.target.value)} />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setIsAccModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">取消</button>
                <button onClick={handleCreateAccount} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700">确认</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 弹窗：记账 --- */}
      {isTxnModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-[500px] animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              📝 记一笔
              {/* 收入支出切换 */}
              <div className="ml-auto flex bg-slate-100 p-1 rounded-xl">
                <button 
                  onClick={() => setTxnForm({...txnForm, txn_type: 'EXPENSE', category: 'PROCUREMENT'})}
                  className={`px-4 py-1 rounded-lg text-sm font-bold transition-all ${txnForm.txn_type === 'EXPENSE' ? 'bg-white shadow text-red-600' : 'text-slate-400'}`}
                >支出</button>
                <button 
                  onClick={() => setTxnForm({...txnForm, txn_type: 'INCOME', category: 'SALES'})}
                  className={`px-4 py-1 rounded-lg text-sm font-bold transition-all ${txnForm.txn_type === 'INCOME' ? 'bg-white shadow text-green-600' : 'text-slate-400'}`}
                >收入</button>
              </div>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-gray-500 mb-1">金额</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-400 font-bold">¥</span>
                  <input type="number" autoFocus className="w-full pl-8 p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none text-2xl font-bold"
                    value={txnForm.amount} onChange={e => setTxnForm({...txnForm, amount: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">资金账户</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl border-transparent focus:border-blue-500 outline-none"
                  value={txnForm.account_id} onChange={e => setTxnForm({...txnForm, account_id: e.target.value})}>
                  <option value="">-- 选择账户 --</option>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">收支分类</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl border-transparent focus:border-blue-500 outline-none"
                  value={txnForm.category} onChange={e => setTxnForm({...txnForm, category: e.target.value})}>
                  {txnForm.txn_type === 'INCOME' ? (
                    <>
                      <option value="SALES">💰 销售回款</option>
                      <option value="OTHER_IN">📈 其他收入</option>
                    </>
                  ) : (
                    <>
                      <option value="PROCUREMENT">🧱 采购原料</option>
                      <option value="SALARY">👷 工人工资</option>
                      <option value="RENT">🏠 房租水电</option>
                      <option value="LOGISTICS">🚚 物流运费</option>
                      <option value="MEALS">🍱 伙食招待</option>
                      <option value="OTHER_OUT">💸 其他支出</option>
                    </>
                  )}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-gray-500 mb-1">关联项目 (可选)</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl border-transparent focus:border-blue-500 outline-none"
                  value={txnForm.project_id} onChange={e => setTxnForm({...txnForm, project_id: e.target.value})}>
                  <option value="">-- 不关联项目 --</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-gray-500 mb-1">备注说明</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none"
                  placeholder="例如: 支付xx板材款"
                  value={txnForm.description} onChange={e => setTxnForm({...txnForm, description: e.target.value})} />
              </div>
              
              <div className="col-span-2">
                 <label className="block text-sm text-gray-500 mb-1">日期</label>
                 <input type="date" className="w-full p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none"
                  value={txnForm.txn_date} onChange={e => setTxnForm({...txnForm, txn_date: e.target.value})} />
              </div>

            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setIsTxnModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">取消</button>
              <button onClick={handleRecordTxn} className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg ${txnForm.txn_type === 'INCOME' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>确认记账</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}