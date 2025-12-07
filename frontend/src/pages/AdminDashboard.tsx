import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Card } from 'antd';
import { DatabaseOutlined, DashboardOutlined, ProjectOutlined } from '@ant-design/icons';
import CreateMaterialModal from '../components/CreateMaterialModal'; 
import ProjectManager from '../components/ProjectManager';
import { SolutionOutlined } from '@ant-design/icons'; // 找个图标
import WorkOrderManager from '../components/WorkOrderManager'; // 引入组件

const { Header, Sider, Content } = Layout;

const AdminDashboard: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  // ⬇️ 2. 新增状态：记录当前选中的菜单 Key (默认选 '2' 项目管理)
  const [activeMenu, setActiveMenu] = useState('2'); 
  const [isCreateMatOpen, setIsCreateMatOpen] = useState(false);
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  // ⬇️ 3. 渲染内容的逻辑函数
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
      default:
        return <div>🚧 报表分析功能正在开发中 (Coming Soon)</div>;
      case '3': // 生产执行 (WO)
        return <WorkOrderManager />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6 }} />
        
        {/* ⬇️ 4. 菜单绑定点击事件 */}
        <Menu 
          theme="dark" 
          defaultSelectedKeys={['2']} 
          mode="inline" 
          onClick={(e) => setActiveMenu(e.key)} // 点击切换
          items={[
            { key: '1', icon: <DatabaseOutlined />, label: '基础数据' },
            { key: '2', icon: <ProjectOutlined />, label: '项目管理' },
            { key: '4', icon: <DashboardOutlined />, label: '报表分析' },
            { key: '3', icon: <SolutionOutlined />, label: '生产执行 (WO)' },
          ]} 
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }} />
        <Content style={{ margin: '16px 16px' }}>
          <div style={{ padding: 24, minHeight: 360, background: colorBgContainer, borderRadius: borderRadiusLG }}>
            
            {/* ⬇️ 5. 这里动态渲染内容 */}
            {renderContent()}
            
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminDashboard;