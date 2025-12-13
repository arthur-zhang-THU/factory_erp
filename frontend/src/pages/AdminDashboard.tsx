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
  UserOutlined,       // 👤 员工管理图标
  LogoutOutlined      // 🚪 退出图标
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom'; // 用于退出跳转

// 引入组件
import CreateMaterialModal from '../components/CreateMaterialModal'; 
import ProjectManager from '../components/ProjectManager';
import WorkOrderManager from '../components/WorkOrderManager'; 
import BIReport from '../components/BIReport';
import PurchasingDashboard from '../components/PurchasingDashboard';
import UserManager from '../components/UserManager'; // 👤 引入员工管理
import Finance from './Finance'; 
import Invoices from './Invoices';

const { Header, Sider, Content } = Layout;

const AdminDashboard: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('2'); 
  const [isCreateMatOpen, setIsCreateMatOpen] = useState(false);
  const navigate = useNavigate();
  
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  // 1️⃣ 获取当前用户角色
  const userRole = localStorage.getItem('role');
  const username = localStorage.getItem('user');

  // 2️⃣ 定义菜单逻辑 (移到 JSX 外面)
  const menuItems: any[] = [
    { key: '1', icon: <DatabaseOutlined />, label: '基础数据' },
    { key: '2', icon: <ProjectOutlined />, label: '项目管理' },
    { key: '3', icon: <SolutionOutlined />, label: '生产执行' },
    { key: '5', icon: <ShoppingCartOutlined />, label: '采购缺料' },
    { key: '4', icon: <DashboardOutlined />, label: '报表分析' },
  ];

  // 🔒 只有 ADMIN 才能看到这些
  if (userRole === 'ADMIN') {
    menuItems.push(
      { type: 'divider' },
      { key: '6', icon: <BankOutlined />, label: '资金看板' },
      { key: '7', icon: <FileTextOutlined />, label: '应收应付' },
      { key: '8', icon: <UserOutlined />, label: '员工管理' } // 👤 新增
    );
  }

  // 3️⃣ 退出登录逻辑
  const handleLogout = () => {
    localStorage.clear(); // 清空 Token
    navigate('/login');   // 跳回登录
  };

  // 4️⃣ 渲染内容逻辑
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
      
      // 🔒 财务与管理 (加一层安全校验，防止有人改代码强行访问)
      case '6': return userRole === 'ADMIN' ? <Finance /> : <div>无权访问</div>;
      case '7': return userRole === 'ADMIN' ? <Invoices /> : <div>无权访问</div>;
      case '8': return userRole === 'ADMIN' ? <UserManager /> : <div>无权访问</div>; // 👤 渲染员工管理
        
      default: return <div>🚧 功能开发中</div>;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div className="h-8 m-4 bg-white/20 rounded flex items-center justify-center text-white font-bold tracking-wider overflow-hidden">
           {collapsed ? 'ERP' : '🏭 Factory ERP'}
        </div>
        
        {/* 这里的 items 直接使用我们上面定义好的变量 */}
        <Menu 
          theme="dark" 
          defaultSelectedKeys={['2']} 
          mode="inline" 
          onClick={(e) => setActiveMenu(e.key)} 
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