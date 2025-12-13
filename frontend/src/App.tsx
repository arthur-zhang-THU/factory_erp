import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import WorkerTerminal from './pages/WorkerTerminal'
import AdminDashboard from './pages/AdminDashboard'
import Finance from './pages/Finance'
import Invoices from './pages/Invoices'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 根路径：导航页 */}
        <Route path="/" element={<HomeNav />} />
        
        {/* 车间路由 */}
        <Route path="/worker" element={<WorkerTerminal />} />
        
        {/* 后台路由 */}
        <Route path="/admin" element={<AdminDashboard />} />
        {/* 财务路由 */}
        <Route path="/finance" element={<Finance />} />
        {/* 发票路由 */}
        <Route path="/invoices" element={<Invoices />} />
      </Routes>
    </BrowserRouter>
  )
}

// 简单的导航首页组件
function HomeNav() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-800 text-white gap-10">
      <h1 className="text-5xl font-bold">🏭 广告工厂 ERP 系统</h1>
      <div className="flex gap-10">
        <Link to="/worker">
          <button className="w-64 h-40 bg-blue-600 rounded-3xl text-2xl font-bold hover:scale-105 transition shadow-2xl border-b-8 border-blue-800 active:border-b-0 active:translate-y-2">
            👷 车间终端
          </button>
        </Link>
        <Link to="/admin">
          <button className="w-64 h-40 bg-gray-100 text-slate-900 rounded-3xl text-2xl font-bold hover:scale-105 transition shadow-2xl border-b-8 border-gray-400 active:border-b-0 active:translate-y-2">
            👨‍💼 管理后台
          </button>
        </Link>
      </div>
    </div>
  )
}

export default App