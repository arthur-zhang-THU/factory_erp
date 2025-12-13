import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Card } from 'antd';
import { 
  DatabaseOutlined, 
  DashboardOutlined, 
  ProjectOutlined, 
  SolutionOutlined, 
  ShoppingCartOutlined,
  BankOutlined,      // 🏦 新增图标
  FileTextOutlined   // 📄 新增图标
} from '@ant-design/icons';

// 引入现有组件
import CreateMaterialModal from '../components/CreateMaterialModal'; 
import ProjectManager from '../components/ProjectManager';
import WorkOrderManager from '../components/WorkOrderManager'; 
import BIReport from '../components/BIReport';
import PurchasingDashboard from '../components/PurchasingDashboard';

// 🆕 引入新开发的财务页面 (注意路径，根据你实际存放的位置，可能是 ../pages/...)
import Finance from './Finance'; 
import Invoices from './Invoices';

const { Header, Sider, Content } = Layout;

const AdminDashboard: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  // 默认选中 '2' (项目管理)
  const [activeMenu, setActiveMenu] = useState('2'); 
  const [isCreateMatOpen, setIsCreateMatOpen] = useState(false);
  
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  // ⬇️ 渲染内容的逻辑函数
  const renderContent = () => {
    switch (activeMenu) {
      case '1': // 基础数据
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
      case '2': // 项目管理
        return <ProjectManager />;
      case '3': // 生产执行 (WO)
        return <WorkOrderManager />;
      case '4': // 报表分析
        return <BIReport />;
      case '5': // 采购缺料
        return <PurchasingDashboard />;
      
      // 🆕 新增财务模块
      case '6': // 资金看板
        return <Finance />;
      case '7': // 应收应付
        return <Invoices />;
        
      default:
        return <div>🚧 功能开发中</div>;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6 }} />
        
        {/* 侧边栏菜单 */}
        <Menu 
          theme="dark" 
          defaultSelectedKeys={['2']} 
          mode="inline" 
          onClick={(e) => setActiveMenu(e.key)} 
          items={[
            { key: '1', icon: <DatabaseOutlined />, label: '基础数据' },
            { key: '2', icon: <ProjectOutlined />, label: '项目管理' },
            { key: '3', icon: <SolutionOutlined />, label: '生产执行' },
            { key: '5', icon: <ShoppingCartOutlined />, label: '采购缺料' },
            { key: '4', icon: <DashboardOutlined />, label: '报表分析' },
            // 分割线或者分组感
            { type: 'divider' },
            // 🆕 财务入口
            { key: '6', icon: <BankOutlined />, label: '资金看板' },
            { key: '7', icon: <FileTextOutlined />, label: '应收应付' },
          ]} 
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }} />
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