import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Card } from 'antd';
import { 
  DatabaseOutlined, 
  DashboardOutlined, 
  ProjectOutlined, 
  SolutionOutlined, 
  ShoppingCartOutlined,
  BankOutlined,      
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
  ScanOutlined // 🆕 引入扫码图标
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import CreateMaterialModal from '../components/CreateMaterialModal'; 
import ProjectManager from '../components/ProjectManager';
import WorkOrderManager from '../components/WorkOrderManager'; 
import BIReport from '../components/BIReport';
import PurchasingDashboard from '../components/PurchasingDashboard';
import UserManager from '../components/UserManager';
import Finance from './Finance'; 
import Invoices from './Invoices';

const { Header, Sider, Content } = Layout;

const AdminDashboard: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('2'); 
  const [isCreateMatOpen, setIsCreateMatOpen] = useState(false);
  const navigate = useNavigate();
  
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const userRole = localStorage.getItem('role');
  const username = localStorage.getItem('user');

  // --- 1️⃣ 定义菜单 (包含车间入口) ---
  const menuItems: any[] = [
    { key: '1', icon: <DatabaseOutlined />, label: '基础数据' },
    { key: '2', icon: <ProjectOutlined />, label: '项目管理' },
    { key: '3', icon: <SolutionOutlined />, label: '生产执行' },
    { key: '5', icon: <ShoppingCartOutlined />, label: '采购缺料' },
    { key: '4', icon: <DashboardOutlined />, label: '报表分析' },
    { type: 'divider' },
    // 🆕 所有人都能看到这个入口，点击去车间
    { key: 'worker_terminal', icon: <ScanOutlined />, label: '进入车间终端' },
  ];

  // 🔒 只有 ADMIN 才能看到财务和员工管理
  if (userRole === 'ADMIN') {
    menuItems.push(
      { type: 'divider' },
      { key: '6', icon: <BankOutlined />, label: '资金看板' },
      { key: '7', icon: <FileTextOutlined />, label: '应收应付' },
      { key: '8', icon: <UserOutlined />, label: '员工管理' }
    );
  }

  // --- 2️⃣ 处理点击逻辑 (关键！) ---
  const handleMenuClick = (e: any) => {
    if (e.key === 'worker_terminal') {
      // 🚀 如果点的是车间，直接跳转路由
      navigate('/worker');
    } else {
      // 其他情况，切换右侧组件
      setActiveMenu(e.key);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const renderContent = () => {
    switch (activeMenu) {
      case '1': 
        return (
           <div className="space-y-6">
              <h2 className="text-2xl font-bold">基础数据管理</h2>
              <Card title="物料主数据" bordered={false} className="shadow-md w-96">
                <p className="mb-4 text-gray-500">录入新的原材料规格和标准成本。</p>
                <Button type="primary" onClick={() => setIsCreateMatOpen(true)}>
                  + 新增物料
                </Button>
              </Card>
              <CreateMaterialModal open={isCreateMatOpen} onClose={() => setIsCreateMatOpen(false)} />
           </div>
        );
      case '2': return <ProjectManager />;
      case '3': return <WorkOrderManager />;
      case '4': return <BIReport />;
      case '5': return <PurchasingDashboard />;
      
      // 🔒 安全校验
      case '6': return userRole === 'ADMIN' ? <Finance /> : <div>无权访问</div>;
      case '7': return userRole === 'ADMIN' ? <Invoices /> : <div>无权访问</div>;
      case '8': return userRole === 'ADMIN' ? <UserManager /> : <div>无权访问</div>;
        
      default: return <div>🚧 功能开发中</div>;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div className="h-8 m-4 bg-white/20 rounded flex items-center justify-center text-white font-bold tracking-wider overflow-hidden">
           {collapsed ? 'ERP' : '🏭 Factory ERP'}
        </div>
        
        <Menu 
          theme="dark" 
          defaultSelectedKeys={['2']} 
          mode="inline" 
          onClick={handleMenuClick} // 👈 这里绑定了新的处理函数
          items={menuItems} 
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer }} className="flex justify-between items-center">
          <div className="text-lg font-bold text-gray-700">
            欢迎回来, {username} <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded ml-2">{userRole}</span>
          </div>
          <Button icon={<LogoutOutlined />} onClick={handleLogout} danger>
            退出登录
          </Button>
        </Header>
        <Content style={{ margin: '16px 16px' }}>
          <div style={{ padding: 24, minHeight: 360, background: colorBgContainer, borderRadius: borderRadiusLG, overflow: 'auto' }}>
            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminDashboard;