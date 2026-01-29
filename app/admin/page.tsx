'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

interface Order {
  id: string;
  createdAt: string;
  customerName: string;
  phoneNumber: string;
  denominationLabel: string;
  quantity: number;
  subtotalFormatted: string;
  feeFormatted: string;
  totalFormatted: string;
  address: string;
  note: string;
  status: string;
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Mật khẩu admin đơn giản (trong thực tế nên dùng authentication phức tạp hơn)
  const ADMIN_PASSWORD = 'admin123';

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      loadOrders();
    } else {
      alert('Mật khẩu không đúng!');
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/orders');
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders);
      } else {
        console.error('Lỗi tải đơn hàng:', data.error);
        setOrders([]);
      }
    } catch (error) {
      console.error('Lỗi kết nối API:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const response = await fetch('/api/orders/export');
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `don-hang-li-xi-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('✅ Đã tải xuống file Excel thành công!');
      } else {
        const errorData = await response.json();
        alert(`❌ Lỗi: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Lỗi xuất Excel:', error);
      alert('❌ Có lỗi xảy ra khi xuất Excel!');
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        // Cập nhật state local
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { ...order, status: newStatus }
              : order
          )
        );
        
        // Cập nhật file Excel
        await fetch('/api/orders/export', { method: 'POST' });
        
        alert('✅ Đã cập nhật trạng thái đơn hàng!');
      } else {
        alert(`❌ Lỗi: ${result.error}`);
      }
    } catch (error) {
      console.error('Lỗi cập nhật trạng thái:', error);
      alert('❌ Có lỗi xảy ra khi cập nhật trạng thái!');
    }
  };

  const clearAllOrders = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa TẤT CẢ đơn hàng? Hành động này không thể hoàn tác!')) {
      return;
    }

    try {
      const response = await fetch('/api/orders', { method: 'DELETE' });
      const data = await response.json();
      
      if (data.success) {
        // Cập nhật lại file Excel sau khi xóa
        await fetch('/api/orders/export', { method: 'POST' });
        alert('✅ Đã xóa tất cả đơn hàng và cập nhật file Excel!');
        setOrders([]);
      } else {
        alert(`❌ Lỗi: ${data.error}`);
      }
    } catch (error) {
      console.error('Lỗi xóa đơn hàng:', error);
      alert('❌ Có lỗi xảy ra khi xóa đơn hàng!');
    }
  };

  const calculateStats = () => {
    const totalOrders = orders.length;
    const completedOrders = orders.filter(order => order.status === 'Hoàn tất').length;
    const pendingOrders = orders.filter(order => order.status === 'Chờ xử lý').length;
    
    // Tính tổng doanh thu (tất cả đơn)
    const totalRevenue = orders.reduce((sum, order) => {
      if (order.totalFormatted) {
        const amount = parseFloat(order.totalFormatted.replace(/[^\d]/g, ''));
        return sum + (isNaN(amount) ? 0 : amount);
      }
      return sum;
    }, 0);

    // Tính tổng tiền gốc đã giao (chỉ đơn hoàn tất)
    const totalDeliveredAmount = orders
      .filter(order => order.status === 'Hoàn tất')
      .reduce((sum, order) => {
        if (order.subtotalFormatted) {
          const amount = parseFloat(order.subtotalFormatted.replace(/[^\d]/g, ''));
          return sum + (isNaN(amount) ? 0 : amount);
        }
        return sum;
      }, 0);

    // Tính tổng tiền lời đã nhận (chỉ đơn hoàn tất)
    const totalProfit = orders
      .filter(order => order.status === 'Hoàn tất')
      .reduce((sum, order) => {
        if (order.feeFormatted) {
          const amount = parseFloat(order.feeFormatted.replace(/[^\d]/g, ''));
          return sum + (isNaN(amount) ? 0 : amount);
        }
        return sum;
      }, 0);
    
    return { 
      totalOrders, 
      totalRevenue, 
      pendingOrders, 
      completedOrders,
      totalDeliveredAmount,
      totalProfit
    };
  };

  // Tự động tải đơn hàng khi component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">🔐 Admin Panel</h1>
            <p className="text-gray-600">Nhập mật khẩu để truy cập</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Mật khẩu admin"
              className="w-full p-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-semibold bg-white placeholder-gray-600"
            />
            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-bold"
            >
              Đăng Nhập
            </button>
          </div>
          
          <div className="mt-4 text-center text-sm text-gray-500">
            <p>Mật khẩu mặc định: admin123</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-1">👨‍💼 Admin Panel - Quản Lý Đơn Hàng</h1>
              <p className="text-blue-100">Dịch vụ đổi tiền lì xì Tết</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={loadOrders}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
              >
                🔄 Tải lại
              </button>
              <button
                onClick={() => setIsAuthenticated(false)}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition-colors"
              >
                🚪 Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Thống kê */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-lg text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">{stats.totalOrders}</div>
            <div className="text-sm text-gray-600">Tổng đơn hàng</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-lg text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">{stats.completedOrders}</div>
            <div className="text-sm text-gray-600">Đã hoàn tất</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-lg text-center">
            <div className="text-2xl font-bold text-yellow-600 mb-1">{stats.pendingOrders}</div>
            <div className="text-sm text-gray-600">Chờ xử lý</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-lg text-center">
            <div className="text-lg font-bold text-purple-600 mb-1">
              {stats.totalDeliveredAmount.toLocaleString('vi-VN')} ₫
            </div>
            <div className="text-sm text-gray-600">Tiền gốc đã giao</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-lg text-center">
            <div className="text-lg font-bold text-orange-600 mb-1">
              {stats.totalProfit.toLocaleString('vi-VN')} ₫
            </div>
            <div className="text-sm text-gray-600">Tiền lời đã nhận</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-lg text-center">
            <div className="text-lg font-bold text-red-600 mb-1">
              {stats.totalRevenue.toLocaleString('vi-VN')} ₫
            </div>
            <div className="text-sm text-gray-600">Tổng doanh thu</div>
          </div>
        </div>

        {/* Nút điều khiển */}
        <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={exportToExcel}
              disabled={orders.length === 0}
              className={`px-6 py-3 rounded-lg font-bold transition-colors ${
                orders.length > 0
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              📊 Tải Excel ({orders.length} đơn)
            </button>
            
            <a
              href="/assets/orders.xlsx"
              download
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold"
            >
              📁 Xem File Excel Cố Định
            </a>
            
            <button
              onClick={clearAllOrders}
              disabled={orders.length === 0}
              className={`px-6 py-3 rounded-lg font-bold transition-colors ${
                orders.length > 0
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              🗑️ Xóa Tất Cả
            </button>
            
            <button
              onClick={loadOrders}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold"
            >
              🔄 Tải Lại Dữ Liệu
            </button>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>📝 Lưu ý:</strong> File Excel cố định được lưu tại <code>/public/assets/orders.xlsx</code> và được cập nhật tự động mỗi khi có đơn hàng mới.
            </p>
          </div>
        </div>

        {/* Danh sách đơn hàng */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 Danh Sách Đơn Hàng</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Đang tải dữ liệu...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-gray-600 mb-2">Chưa có đơn hàng nào</h3>
              <p className="text-gray-500">Đơn hàng sẽ hiển thị ở đây khi khách hàng đặt hàng</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border-2 border-gray-400">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border-2 border-gray-400 px-4 py-3 text-left font-bold text-gray-900">ID</th>
                    <th className="border-2 border-gray-400 px-4 py-3 text-left font-bold text-gray-900">Thời gian</th>
                    <th className="border-2 border-gray-400 px-4 py-3 text-left font-bold text-gray-900">Tên KH</th>
                    <th className="border-2 border-gray-400 px-4 py-3 text-left font-bold text-gray-900">SĐT</th>
                    <th className="border-2 border-gray-400 px-4 py-3 text-left font-bold text-gray-900">Mệnh giá</th>
                    <th className="border-2 border-gray-400 px-4 py-3 text-left font-bold text-gray-900">SL</th>
                    <th className="border-2 border-gray-400 px-4 py-3 text-left font-bold text-gray-900">Tổng tiền</th>
                    <th className="border-2 border-gray-400 px-4 py-3 text-left font-bold text-gray-900">Địa chỉ</th>
                    <th className="border-2 border-gray-400 px-4 py-3 text-left font-bold text-gray-900">Trạng thái</th>
                    <th className="border-2 border-gray-400 px-4 py-3 text-left font-bold text-gray-900">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-100 bg-white">
                      <td className="border-2 border-gray-400 px-4 py-3 font-mono text-sm font-semibold text-gray-900">{order.id}</td>
                      <td className="border-2 border-gray-400 px-4 py-3 font-semibold text-gray-900">{order.createdAt}</td>
                      <td className="border-2 border-gray-400 px-4 py-3 font-semibold text-gray-900">{order.customerName}</td>
                      <td className="border-2 border-gray-400 px-4 py-3 font-semibold text-gray-900">{order.phoneNumber}</td>
                      <td className="border-2 border-gray-400 px-4 py-3 font-semibold text-gray-900">{order.denominationLabel}</td>
                      <td className="border-2 border-gray-400 px-4 py-3 text-center font-semibold text-gray-900">{order.quantity}</td>
                      <td className="border-2 border-gray-400 px-4 py-3 font-bold text-red-700">{order.totalFormatted}</td>
                      <td className="border-2 border-gray-400 px-4 py-3 max-w-xs truncate font-semibold text-gray-900">{order.address}</td>
                      <td className="border-2 border-gray-400 px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          order.status === 'Hoàn tất' 
                            ? 'bg-green-200 text-green-900' 
                            : 'bg-yellow-200 text-yellow-900'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="border-2 border-gray-400 px-4 py-3">
                        {order.status === 'Chờ xử lý' ? (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'Hoàn tất')}
                            className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm font-bold"
                          >
                            ✅ Hoàn tất
                          </button>
                        ) : (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'Chờ xử lý')}
                            className="bg-yellow-600 text-white px-3 py-1 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-bold"
                          >
                            🔄 Chờ xử lý
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Thống kê chi tiết */}
        {orders.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">📈 Báo Cáo Chi Tiết</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Thống kê theo trạng thái */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg">
                <h3 className="text-lg font-bold text-blue-800 mb-4">📊 Thống Kê Theo Trạng Thái</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Tổng số đơn hàng:</span>
                    <span className="font-bold text-blue-600">{stats.totalOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Đã hoàn tất:</span>
                    <span className="font-bold text-green-600">{stats.completedOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Chờ xử lý:</span>
                    <span className="font-bold text-yellow-600">{stats.pendingOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Tỷ lệ hoàn thành:</span>
                    <span className="font-bold text-purple-600">
                      {stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Thống kê tài chính */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg">
                <h3 className="text-lg font-bold text-green-800 mb-4">💰 Thống Kê Tài Chính</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Tiền gốc đã giao:</span>
                    <span className="font-bold text-purple-600">
                      {stats.totalDeliveredAmount.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Tiền lời đã nhận:</span>
                    <span className="font-bold text-orange-600">
                      {stats.totalProfit.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Tổng doanh thu:</span>
                    <span className="font-bold text-red-600">
                      {stats.totalRevenue.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Tỷ lệ lời:</span>
                    <span className="font-bold text-green-600">
                      {stats.totalDeliveredAmount > 0 
                        ? Math.round((stats.totalProfit / stats.totalDeliveredAmount) * 100) 
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-bold text-yellow-800 mb-2">📝 Ghi Chú:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• <strong>Tiền gốc đã giao:</strong> Tổng giá trị tiền lì xì đã giao cho khách hàng (chỉ tính đơn hoàn tất)</li>
                <li>• <strong>Tiền lời đã nhận:</strong> Tổng phí dịch vụ đã thu được (chỉ tính đơn hoàn tất)</li>
                <li>• <strong>Tổng doanh thu:</strong> Tổng số tiền khách hàng đã thanh toán (tất cả đơn hàng)</li>
                <li>• <strong>Tỷ lệ lời:</strong> Phần trăm lợi nhuận so với tiền gốc đã giao</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}