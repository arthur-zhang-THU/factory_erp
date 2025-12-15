import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import Login from './pages/Login' 
import WorkerTerminal from './pages/WorkerTerminal'
import AdminDashboard from './pages/AdminDashboard'

// --- 🔒 2. 路由守卫组件 ---
const PrivateRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles?: string[] }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const location = useLocation();

  // A. 没登录？ -> 踢去登录页
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // B. 角色不符？ -> 踢回首页或警告
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // 如果是工人误点管理后台 -> 强制去车间
    if (role === 'WORKER') return <Navigate to="/worker" replace />;
    // 其他情况 -> 回首页
    return <Navigate to="/" replace />;
  }

  // C. 验证通过 -> 放行
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 公开路由 */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<HomeNav />} />
        
        {/* 🔒 车间终端：允许 工人、老板、设计师、 工头 (FOREMAN) */}
        <Route path="/worker" element={
          <PrivateRoute allowedRoles={['WORKER', 'ADMIN', 'DESIGNER', 'FOREMAN']}>
            <WorkerTerminal />
          </PrivateRoute>
        } />
        
        {/* 🔒 管理后台：允许 老板、设计师、 工头 (FOREMAN) */}
        {/* 工头需要进后台来进行“排程” */}
        <Route path="/admin" element={
          <PrivateRoute allowedRoles={['ADMIN', 'DESIGNER', 'FOREMAN']}>
            <AdminDashboard />
          </PrivateRoute>
        } />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
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
        
        {/* 去车间 */}
        <Link to="/worker">
          <button className="w-64 h-40 bg-blue-600 rounded-3xl text-2xl font-bold hover:scale-105 transition shadow-2xl border-b-8 border-blue-800 active:border-b-0 active:translate-y-2 cursor-pointer">
            👷 车间终端
          </button>
        </Link>

        {/* 去后台 */}
        <Link to="/admin">
          <button className="w-64 h-40 bg-gray-100 text-slate-900 rounded-3xl text-2xl font-bold hover:scale-105 transition shadow-2xl border-b-8 border-gray-400 active:border-b-0 active:translate-y-2 cursor-pointer">
            👨‍💼 管理后台
          </button>
        </Link>

      </div>
      
      <div className="text-slate-500 text-sm mt-10">
        © 2025 Factory ERP | 
        <Link to="/login" className="ml-2 hover:text-white underline">切换账号登录</Link>
      </div>
    </div>
  )
}

export default App