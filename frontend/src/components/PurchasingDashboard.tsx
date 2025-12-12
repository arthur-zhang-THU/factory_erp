import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Tag, Statistic, Row, Col, message } from 'antd';
import { ShoppingCartOutlined, SyncOutlined, AlertOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

interface MRPItem {
    material_id: number;
    material_name: string;
    material_spec: string;
    current_stock: number;
    required_qty: number;
    shortage_qty: number;
    status: 'OK' | 'SHORTAGE';
}

const PurchasingDashboard: React.FC = () => {
    const [data, setData] = useState<MRPItem[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchMRP = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:8000/purchasing/mrp_analysis');
            setData(res.data);
        } catch (error) {
            message.error('MRP 计算失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMRP();
    }, []);

    // 统计缺货种类数
    const shortageCount = data.filter(i => i.status === 'SHORTAGE').length;

    const columns = [
        { title: '物料名称', dataIndex: 'material_name', key: 'name', render: (t:string, r:any) => 
            <div>
                <div className="font-bold">{t}</div>
                <div className="text-xs text-gray-400">{r.material_spec}</div>
            </div> 
        },
        { 
            title: '当前库存', 
            dataIndex: 'current_stock', 
            render: (v: number) => <span className="text-gray-500">{v}</span>
        },
        { 
            title: '生产需求', 
            dataIndex: 'required_qty',
            render: (v: number) => <span className="text-blue-600 font-bold">{v}</span>
        },
        { 
            title: '缺口 (建议采购)', 
            dataIndex: 'shortage_qty',
            render: (v: number, r: MRPItem) => (
                r.status === 'SHORTAGE' 
                ? <span className="text-red-500 font-bold text-lg">-{v}</span>
                : <span className="text-green-500">充足</span>
            )
        },
        { 
            title: '状态', 
            dataIndex: 'status',
            render: (s: string) => (
                s === 'SHORTAGE' 
                ? <Tag color="error" icon={<AlertOutlined />}>缺料</Tag>
                : <Tag color="success" icon={<CheckCircleOutlined />}>正常</Tag>
            )
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-700">🛒 采购与缺料分析 (MRP)</h2>
                <Button type="primary" size="large" icon={<SyncOutlined />} onClick={fetchMRP} loading={loading}>
                    重新计算 MRP
                </Button>
            </div>

            <Row gutter={16}>
                <Col span={12}>
                    <Card>
                        <Statistic 
                            title="缺料物料种类" 
                            value={shortageCount} 
                            valueStyle={{ color: shortageCount > 0 ? '#cf1322' : '#3f8600' }}
                            prefix={<ShoppingCartOutlined />}
                            suffix="种"
                        />
                    </Card>
                </Col>
                <Col span={12}>
                    <Card>
                        <Statistic 
                            title="物料总状态" 
                            value={data.length} 
                            suffix="种监控中"
                        />
                    </Card>
                </Col>
            </Row>

            <Card className="shadow-sm" title="物料需求计划表">
                <Table 
                    columns={columns} 
                    dataSource={data} 
                    rowKey="material_id" 
                    pagination={false}
                    loading={loading}
                />
                
                {shortageCount > 0 && (
                    <div className="mt-4 flex justify-end">
                        <Button type="primary" danger size="large" onClick={() => message.success('采购申请单 (PR) 已生成并发送给采购部！')}>
                            一键生成采购申请
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default PurchasingDashboard;