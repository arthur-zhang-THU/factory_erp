import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Card } from 'antd';
import { DatabaseOutlined, DashboardOutlined, ProjectOutlined } from '@ant-design/icons';
import CreateMaterialModal from '../components/CreateMaterialModal'; 

const { Header, Sider, Content } = Layout;

const AdminDashboard: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isCreateMatOpen, setIsCreateMatOpen] = useState(false);
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6 }} />
        <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline" items={[
          { key: '1', icon: <DatabaseOutlined />, label: '基础数据' },
          { key: '2', icon: <ProjectOutlined />, label: '项目管理 (开发中)' },
          { key: '3', icon: <DashboardOutlined />, label: '报表分析 (开发中)' },
        ]} />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }} />
        <Content style={{ margin: '16px 16px' }}>
          
          <div style={{ padding: 24, minHeight: 360, background: colorBgContainer, borderRadius: borderRadiusLG }}>
            <h2 className="text-2xl font-bold mb-6">基础数据管理</h2>
            
            <Card title="物料主数据" bordered={false} style={{ width: 300, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <p className="mb-4 text-gray-500">录入新的原材料规格和标准成本。</p>
              <Button type="primary" size="large" onClick={() => setIsCreateMatOpen(true)}>
                + 新增物料
              </Button>
            </Card>

            <CreateMaterialModal open={isCreateMatOpen} onClose={() => setIsCreateMatOpen(false)} />
          </div>
          
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminDashboard;