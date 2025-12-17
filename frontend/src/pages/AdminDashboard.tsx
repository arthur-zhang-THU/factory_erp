import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Menu, Button, theme, Card, Tag, message, Table, Space, Popconfirm } from 'antd';
import { 
  DatabaseOutlined, DashboardOutlined, ProjectOutlined, 
  SolutionOutlined, ShoppingCartOutlined, BankOutlined,      
  FileTextOutlined, UserOutlined, LogoutOutlined, ScanOutlined,
  EditOutlined, DeleteOutlined, PlusOutlined, DollarCircleOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

// ✅ 引入统一 api，自动处理 Token
import api from '../api';

import CreateMaterialModal from '../components/CreateMaterialModal'; 
import ProjectManager from '../components/ProjectManager';
import WorkOrderManager from '../components/WorkOrderManager'; 
import BIReport from '../components/BIReport';
import PurchasingDashboard from '../components/PurchasingDashboard';
import UserManager from '../components/UserManager';
import Finance from './Finance'; 
import Invoices from './Invoices';

const { Header, Sider, Content } = Layout;

interface AppMenuItem {
  key?: string;
  icon?: React.ReactNode;
  label?: React.ReactNode;
  type?: 'divider' | 'group' | null;
  roles?: string[];
  children?: AppMenuItem[];
}

interface MaterialDetailsDTO {
    id: number;
    name: string;
    spec: string;
    std_cost: number;
    current_stock: number;
}

const AdminDashboard: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('2'); 
  
  const [materials, setMaterials] = useState<MaterialDetailsDTO[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 控制模态框
  const [isCreateMatOpen, setIsCreateMatOpen] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);

  const navigate = useNavigate();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const userRole = localStorage.getItem('role') || 'WORKER';
  const username = localStorage.getItem('user');

  // ✅ 改为 api 调用
  const fetchMaterials = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get<MaterialDetailsDTO[]>('/inventory/material');
            setMaterials(response.data);
        } catch (error: any) {
            // 401 错误由 api.ts 拦截，这里只处理其他错误
            if (error.response?.status !== 401) {
                message.error('加载物料列表失败');
            }
        } finally {
            setLoading(false);
        }
    }, []);

  // ✅ 改为 api 调用
  const handleDelete = async (materialId: number) => {
      try {
          await api.delete(`/inventory/material/${materialId}`);
          message.success(`✅ 物料 ID ${materialId} 删除成功！`);
          fetchMaterials(); 
      } catch (error: any) {
          const msg = error.response?.data?.detail || '删除失败';
          message.error(msg);
      }
  };

  useEffect(() => {
      if (activeMenu === '1') {
          fetchMaterials();
      }
  }, [activeMenu, fetchMaterials]);

  const handleCloseModal = () => {
      setIsCreateMatOpen(false);
      setEditingMaterialId(null); 
  };

  const handleMatUpsertSuccess = () => {
      handleCloseModal();
      fetchMaterials(); 
  };
    
  const handleCreateClick = () => {
      setEditingMaterialId(null); 
      setIsCreateMatOpen(true);
  };

  const allMenuItems: AppMenuItem[] = [
    { 
      key: '1', icon: <DatabaseOutlined />, label: '基础数据', 
      roles: ['ADMIN', 'DESIGNER', 'FOREMAN', 'WORKER'] 
    },
    { key: '2', icon: <ProjectOutlined />, label: '项目管理', roles: ['ADMIN', 'DESIGNER', 'FOREMAN'] },
    { key: '3', icon: <SolutionOutlined />, label: '生产执行 (含排程)', roles: ['ADMIN', 'DESIGNER', 'FOREMAN'] },
    { key: '5', icon: <ShoppingCartOutlined />, label: '采购缺料', roles: ['ADMIN', 'DESIGNER', 'FOREMAN'] },
    { key: '4', icon: <DashboardOutlined />, label: 'BI 报表分析', roles: ['ADMIN'] },
    { type: 'divider' },
    { key: '6', icon: <BankOutlined />, label: '资金看板', roles: ['ADMIN'] },
    { key: '7', icon: <FileTextOutlined />, label: '应收应付 (Invoice)', roles: ['ADMIN', 'DESIGNER'] },
    { type: 'divider' },
    { key: '8', icon: <UserOutlined />, label: '员工/用户管理', roles: ['ADMIN'] },
    { key: 'worker_terminal', icon: <ScanOutlined />, label: '进入车间终端', roles: ['ADMIN', 'DESIGNER', 'FOREMAN', 'WORKER'] },
  ];

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

  const columns = [
      { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
      { title: '物料名称', dataIndex: 'name', key: 'name', sorter: (a: MaterialDetailsDTO, b: MaterialDetailsDTO) => a.name.localeCompare(b.name) },
      { title: '规格型号', dataIndex: 'spec', key: 'spec', width: 200 },
      { title: '标准成本 (¥)', dataIndex: 'std_cost', key: 'std_cost', align: 'right' as const, 
        render: (text: number) => <Tag icon={<DollarCircleOutlined />} color="gold">{text.toFixed(2)}</Tag>, 
        sorter: (a: MaterialDetailsDTO, b: MaterialDetailsDTO) => a.std_cost - b.std_cost 
      },
      { title: '实时库存', dataIndex: 'current_stock', key: 'current_stock', align: 'right' as const, 
        render: (text: number) => <Tag color={text > 0 ? 'green' : (text < 0 ? 'red' : 'default')}>{text.toFixed(2)}</Tag>,
        sorter: (a: MaterialDetailsDTO, b: MaterialDetailsDTO) => a.current_stock - b.current_stock
      },
      { title: '操作', key: 'action', width: 150, render: (_: any, record: MaterialDetailsDTO) => (
          <Space size="small">
              <Button 
                  icon={<EditOutlined />} 
                  onClick={() => { setEditingMaterialId(record.id); setIsCreateMatOpen(true); }} 
                  size="small"
              >
                  编辑
              </Button>
              <Popconfirm
                  title="确定删除吗?"
                  description="该操作会永久删除物料，如果已有交易记录则无法删除。"
                  onConfirm={() => handleDelete(record.id)}
                  okText="是"
                  cancelText="否"
              >
                  <Button icon={<DeleteOutlined />} danger size="small">删除</Button>
              </Popconfirm>
          </Space>
      )},
  ];

  const renderContent = () => {
    switch (activeMenu) {
      case '1': 
        return (
           <div className="space-y-6">
              <h2 className="text-2xl font-bold">基础数据管理</h2>
              <Card 
                  title="物料主数据" 
                  // ✅ 修复警告：使用 variant="borderless"
                  variant="borderless" 
                  className="shadow-md"
                  extra={
                      <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateClick}>
                          + 新增物料
                      </Button>
                  }
              >
                <p className="mb-4 text-gray-500">
                    录入、修改和管理原材料的规格、标准成本，并实时查看当前库存状态。
                </p>
                <Table
                  columns={columns}
                  dataSource={materials}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 800 }}
                />
              </Card>
              <CreateMaterialModal 
                  open={isCreateMatOpen} 
                  onClose={handleCloseModal} 
                  materialId={editingMaterialId}
                  onSuccess={handleMatUpsertSuccess}
              />
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