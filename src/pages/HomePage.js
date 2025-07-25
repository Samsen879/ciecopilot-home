import React from 'react';
import { Row, Col } from 'antd';


const HomePage = () => {
    return (
        <div>
            {/* ... existing code ... */}
            <h1>Core Features</h1>
            <p>Everything you need for CIE A-Level success</p>
            <Row gutter={[16, 16]}>
                <Col span={12} md={6}>
                    <Card title="Topic Navigation">
                        Browse all CIE subjects and topics with precise syllabus mapping. Find what you need instantly.
                    </Card>
                </Col>
                <Col span={12} md={6}>
                    <Card title="AI-Powered Q&A">
                        Ask any CIE question and get detailed, step-by-step answers with official marking points.
                    </Card>
                </Col>
                <Col span={12} md={6}>
                    <Card title="Progress Tracking">
                        Track your mistakes, monitor improvement, and get personalized weekly reports.
                    </Card>
                </Col>
                <Col span={12} md={6}>
                    <Card title="Smart Recommendations">
                        AI suggests exactly what to study next based on your performance and weak areas.
                    </Card>
                </Col>
            </Row>
            {/* ... existing code ... */}
        </div>
    );
};

export default HomePage;