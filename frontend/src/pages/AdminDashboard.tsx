import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Card, Tag, message } from 'antd';
import { 
  DatabaseOutlined, DashboardOutlined, ProjectOutlined, 
  SolutionOutlined, ShoppingCartOutlined, BankOutlined,      
  FileTextOutlined, UserOutlined, LogoutOutlined, ScanOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

// 引入组件
import CreateMaterialModal from '../components/CreateMaterialModal'; 
import ProjectManager from '../components/ProjectManager';
import WorkOrderManager from '../components/WorkOrderManager'; 
import BIReport from '../components/BIReport';
import PurchasingDashboard from '../components/PurchasingDashboard';
import UserManager from '../components/UserManager';
import Finance from './Finance'; 
import Invoices from './Invoices';

const { Header, Sider, Content } = Layout;

// 🆕 1. 定义一个自定义接口，解决 TypeScript 报错
interface AppMenuItem {
    key?: string;
    icon?: React.ReactNode;
    label?: React.ReactNode;
    type?: 'divider' | 'group' | null;
    roles?: string[]; // 我们自定义的权限字段
    children?: AppMenuItem[];
}

const AdminDashboard: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('2'); 
  const [isCreateMatOpen, setIsCreateMatOpen] = useState(false);
  const navigate = useNavigate();
  
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const userRole = localStorage.getItem('role') || 'WORKER';
  const username = localStorage.getItem('user');

  // --- 2️⃣ 使用自定义接口定义菜单 ---
  const allMenuItems: AppMenuItem[] = [
    { 
      key: '1', icon: <DatabaseOutlined />, label: '基础数据', 
      roles: ['ADMIN', 'DESIGNER', 'FOREMAN'] 
    },
    { 
      key: '2', icon: <ProjectOutlined />, label: '项目管理', 
      roles: ['ADMIN', 'DESIGNER', 'FOREMAN'] 
    },
    { 
      key: '3', icon: <SolutionOutlined />, label: '生产执行 (含排程)', 
      roles: ['ADMIN', 'DESIGNER', 'FOREMAN'] 
    },
    { 
      key: '5', icon: <ShoppingCartOutlined />, label: '采购缺料', 
      roles: ['ADMIN', 'DESIGNER', 'FOREMAN'] 
    },
    { 
      key: '4', icon: <DashboardOutlined />, label: 'BI 报表分析', 
      roles: ['ADMIN'] 
    },
    // 分割线
    { type: 'divider' },
    { 
      key: '6', icon: <BankOutlined />, label: '资金看板', 
      roles: ['ADMIN'] 
    },
    { 
      key: '7', icon: <FileTextOutlined />, label: '应收应付 (Invoice)', 
      roles: ['ADMIN', 'DESIGNER'] 
    },
    { type: 'divider' },
    { 
      key: '8', icon: <UserOutlined />, label: '员工/用户管理', 
      roles: ['ADMIN'] 
    },
    // 车间入口
    { 
      key: 'worker_terminal', icon: <ScanOutlined />, label: '进入车间终端', 
      roles: ['ADMIN', 'DESIGNER', 'FOREMAN', 'WORKER'] 
    },
  ];

  // --- 3️⃣ 过滤菜单 ---
  const menuItems = allMenuItems.filter(item => {
    if (item.type === 'divider') return true;
    return item.roles ? item.roles.includes(userRole) : true;
  });

  const handleMenuClick = (e: any) => {
    if (e.key === 'worker_terminal') {
      navigate('/worker');
    } else {
      setActiveMenu(e.key);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const checkAuth = (allowedRoles: string[]) => {
    return allowedRoles.includes(userRole);
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
      case '4': return checkAuth(['ADMIN']) ? <BIReport /> : <div className="p-10 text-red-500">⛔️ 权限不足：仅老板可见</div>;
      case '5': return <PurchasingDashboard />;
      case '6': return checkAuth(['ADMIN']) ? <Finance /> : <div className="p-10 text-red-500">⛔️ 权限不足</div>;
      case '7': return checkAuth(['ADMIN', 'DESIGNER']) ? <Invoices /> : <div className="p-10 text-red-500">⛔️ 权限不足</div>;
      case '8': return checkAuth(['ADMIN']) ? <UserManager /> : <div className="p-10 text-red-500">⛔️ 权限不足</div>;
      default: return <div>🚧 请在左侧选择菜单</div>;
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
          onClick={handleMenuClick} 
          // 🆕 4. 这里的 `as any` 是关键，它解决了类型不匹配的报错
          items={menuItems as any} 
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer }} className="flex justify-between items-center">
          <div className="text-lg font-bold text-gray-700">
            欢迎回来, {username} 
            <Tag color="geekblue" className="ml-3">{userRole}</Tag>
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