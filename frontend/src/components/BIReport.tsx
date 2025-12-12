import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Row, Col, Statistic, message } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowUpOutlined, ArrowDownOutlined, DollarOutlined } from '@ant-design/icons';
import axios from 'axios';

interface CostData {
    project_id: number;
    project_name: string;
    est_material_cost: number;
    act_material_cost: number;
    variance: number;
    variance_pct: number;
}

const BIReport: React.FC = () => {
    const [data, setData] = useState<CostData[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:8000/reports/cost_analysis');
            setData(res.data);
        } catch (error) {
            message.error('加载报表数据失败');
        } finally {
            setLoading(false);
        }
    };

    // 计算总览数据
    const totalEst = data.reduce((sum, item) => sum + item.est_material_cost, 0);
    const totalAct = data.reduce((sum, item) => sum + item.act_material_cost, 0);
    const totalVar = totalAct - totalEst;

    const columns = [
        { title: '项目名称', dataIndex: 'project_name', key: 'name' },
        { 
            title: 'BOM 预估成本', 
            dataIndex: 'est_material_cost', 
            render: (v: number) => `¥${v.toLocaleString()}` 
        },
        { 
            title: '实际领料成本', 
            dataIndex: 'act_material_cost',
            render: (v: number) => <b className="text-blue-600">¥{v.toLocaleString()}</b>
        },
        { 
            title: '差异 (Variance)', 
            dataIndex: 'variance',
            render: (v: number) => (
                <span className={v > 0 ? 'text-red-500 font-bold' : 'text-green-500 font-bold'}>
                    {v > 0 ? '+' : ''}¥{v}
                </span>
            )
        },
        { 
            title: '偏差率', 
            dataIndex: 'variance_pct',
            render: (v: number) => {
                const color = v > 10 ? 'red' : v > 0 ? 'orange' : 'green';
                return <Tag color={color}>{v}%</Tag>
            }
        },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-700">📊 成本控制中心 (Cost Control)</h2>

            {/* 1. 核心指标卡片 */}
            <Row gutter={16}>
                <Col span={8}>
                    <Card>
                        <Statistic 
                            title="总预估预算 (Total Budget)" 
                            value={totalEst} 
                            prefix={<DollarOutlined />} 
                            precision={2}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic 
                            title="总实际消耗 (Total Actual)" 
                            value={totalAct} 
                            precision={2}
                            valueStyle={{ color: '#1677ff' }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic 
                            title="总偏差 (Variance)" 
                            value={Math.abs(totalVar)} 
                            precision={2}
                            valueStyle={{ color: totalVar > 0 ? '#cf1322' : '#3f8600' }}
                            prefix={totalVar > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                            suffix={totalVar > 0 ? "超支" : "节约"}
                        />
                    </Card>
                </Col>
            </Row>

            {/* 2. 可视化图表 */}
            <Card title="预估 vs 实际成本对比图" className="shadow-sm">
                <div style={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="project_name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="est_material_cost" name="预估成本" fill="#8884d8" />
                            <Bar dataKey="act_material_cost" name="实际成本" fill="#82ca9d" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            {/* 3. 详细数据表 */}
            <Card title="详细差异分析表" className="shadow-sm">
                <Table 
                    columns={columns} 
                    dataSource={data} 
                    rowKey="project_id" 
                    pagination={false}
                />
            </Card>
        </div>
    );
};

export default BIReport;