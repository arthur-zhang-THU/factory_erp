import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Input, Select, message, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import axios from 'axios';

// ⚠️ 部署时请改为服务器IP
const API_URL = 'http://localhost:8000'; 

interface ProcessEditorProps {
  open: boolean;
  onClose: () => void;
  woId: number | null;
  projectTitle: string;
}

export default function ProcessEditor({ open, onClose, woId, projectTitle }: ProcessEditorProps) {
  const [steps, setSteps] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 🔄 初始化：加载数据
  useEffect(() => {
    if (open && woId) {
      loadData();
    }
  }, [open, woId]);

  // 🆕 核心逻辑：同时拉取工人和现有排程
  const loadData = async () => {
    setLoading(true);
    try {
      const [resUsers, resSteps] = await Promise.all([
        axios.get(`${API_URL}/auth/users`),        // ✅ 修正：使用正确的用户接口
        axios.get(`${API_URL}/work_orders/${woId}/steps`)
      ]);

      // 🎯 筛选：只显示“工人”和“工头”，过滤掉老板和设计师
      const activeWorkers = resUsers.data.filter((u: any) => 
        ['WORKER', 'FOREMAN'].includes(u.role)
      );
      setWorkers(activeWorkers);

      // 如果后端返回了工序，就填进去；否则置空
      if (resSteps.data && resSteps.data.length > 0) {
        // 按顺序排序
        const sorted = resSteps.data.sort((a: any, b: any) => a.sequence - b.sequence);
        setSteps(sorted);
      } else {
        setSteps([]); 
      }
    } catch (e) {
      console.error(e);
      message.error("数据加载失败");
    } finally {
      setLoading(false);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '序号',
      render: (_: any, __: any, index: number) => (
         <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
            {index + 1}
         </div>
      ),
      width: 60,
      align: 'center' as const,
    },
    {
      title: '工序名称',
      dataIndex: 'name',
      render: (text: string, record: any, index: number) => (
        <Input 
          value={text} 
          onChange={e => {
            const newSteps = [...steps];
            newSteps[index].name = e.target.value;
            setSteps(newSteps);
          }} 
          placeholder="如: 激光切割" 
          status={!text ? 'error' : ''}
        />
      ),
    },
    {
      title: '指派工人 (可选)',
      dataIndex: 'assigned_to',
      width: 200,
      render: (val: number, record: any, index: number) => (
        <Select
          style={{ width: '100%' }}
          placeholder="-- 抢单模式 --"
          allowClear
          value={val}
          onChange={v => {
            const newSteps = [...steps];
            newSteps[index].assigned_to = v;
            setSteps(newSteps);
          }}
        >
          {workers.map(w => (
            <Select.Option key={w.id} value={w.id}>
               {w.username} <span style={{fontSize: 12, color: '#999'}}>({w.role})</span>
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (status: string) => status ? <Tag>{status}</Tag> : <Tag>新建立</Tag>
    },
    {
      title: '操作',
      width: 60,
      render: (_: any, __: any, index: number) => (
        <Button danger type="text" icon={<DeleteOutlined />} onClick={() => {
            const newSteps = [...steps];
            newSteps.splice(index, 1);
            setSteps(newSteps);
        }} />
      ),
    },
  ];

  const handleSave = async () => {
    if (!woId) return;
    if (steps.some(s => !s.name)) return message.error("工序名称不能为空");
    
    setSaving(true);
    try {
      // ✅ 发送 steps 数组，后端会自动处理 id (更新) 或 无id (创建)
      await axios.post(`${API_URL}/work_orders/${woId}/steps`, steps);
      message.success("✅ 排程已发布！工人将收到任务。");
      onClose();
    } catch (e) { 
        message.error("保存失败"); 
    } finally {
        setSaving(false);
    }
  };

  // 快速模板
  const applyTemplate = () => {
    setSteps([
      ...steps,
      { name: '激光切割', assigned_to: null },
      { name: '折弯', assigned_to: null },
      { name: '焊接', assigned_to: null },
    ]);
  };

  return (
    <Modal
      title={`🛠️ 工艺排程: ${projectTitle}`}
      open={open}
      onCancel={onClose}
      width={800}
      maskClosable={false}
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="save" type="primary" loading={saving} icon={<SaveOutlined />} onClick={handleSave}>保存并发布</Button>
      ]}
    >
      <div className="mb-4 flex justify-between items-center bg-blue-50 p-3 rounded text-blue-600 text-sm">
         <span>💡 提示：第一道工序将自动变为“进行中”，后续工序默认为“锁定”。</span>
         <Button size="small" type="dashed" onClick={applyTemplate}>+ 插入常用模板</Button>
      </div>
      
      <Table 
        dataSource={steps} 
        columns={columns} 
        rowKey={(r, index) => r.id || `temp-${index}`} // 兼容新旧数据
        pagination={false} 
        size="small" 
        bordered 
        loading={loading}
      />
      
      <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setSteps([...steps, { name: '', assigned_to: null }])} className="mt-2 h-10">
        添加工序
      </Button>
    </Modal>
  );
}