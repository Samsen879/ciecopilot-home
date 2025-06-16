import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="text-center mt-20">
    <h1 className="text-4xl font-bold mb-4">404</h1>
    <p className="mb-6">页面未找到</p>
    <Link to="/" className="text-blue-600 hover:underline">返回首页</Link>
  </div>
);

export default NotFound;
