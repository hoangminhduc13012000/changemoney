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
  feePercentage?: number;
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
      
      // Thử đọc từ GitHub trước với cache busting
      try {
        const timestamp = new Date().getTime();
        const response = await fetch(`https://raw.githubusercontent.com/hoangminhduc13012000/changemoney/main/public/assets/orders.json?t=${timestamp}`, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (response.ok) {
          const ordersData = await response.json();
          setOrders(ordersData || []);
          // Đồng bộ với localStorage
          localStorage.setItem('orders', JSON.stringify(ordersData || []));
          return;
        }
      } catch (error) {
        console.log('Không thể đọc từ GitHub, đọc từ localStorage:', error);
      }

      // Fallback: Đọc từ localStorage
      const savedOrders = localStorage.getItem('orders');
      if (savedOrders) {
        const ordersData = JSON.parse(savedOrders);
        setOrders(ordersData);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Lỗi khi tải đơn hàng:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    try {
      if (orders.length === 0) {
        alert('Không có đơn hàng nào để xuất!');
        return;
      }

      const excelData = orders.map((order) => ({
        'ID Đơn Hàng': order.id,
        'Thời Gian': order.createdAt,
        'Tên Khách Hàng': order.customerName,
        'Số Điện Thoại': order.phoneNumber,
        'Mệnh Giá': order.denominationLabel,
        'Số Lượng Tờ': order.quantity,
        'Giá Trị Tiền Đổi': order.subtotalFormatted,
        'Tỷ Lệ Phí': order.feePercentage ? `${order.feePercentage}%` : '12%',
        'Phí Dịch Vụ': order.feeFormatted,
        'Tổng Thanh Toán': order.totalFormatted,
        'Địa Chỉ Giao Hàng': order.address,
        'Ghi Chú': order.note,
        'Trạng Thái': order.status
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      const colWidths = [
        { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, 
        { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, 
        { wch: 40 }, { wch: 30 }, { wch: 15 }
      ];
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Đơn Hàng Lì Xì');
      const fileName = `don-hang-li-xi-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      alert('✅ Đã tải xuống file Excel thành công!');
    } catch (error) {
      console.error('Lỗi xuất Excel:', error);
      alert('❌ Có lỗi xảy ra khi xuất Excel!');
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      // Cập nhật trong state local trước
      const updatedOrders = orders.map((order) => 
        order.id === orderId 
          ? { ...order, status: newStatus, updatedAt: new Date().toLocaleString('vi-VN') }
          : order
      );
      setOrders(updatedOrders);

      // Lưu vào localStorage ngay lập tức
      localStorage.setItem('orders', JSON.stringify(updatedOrders));

      // Thử lưu vào GitHub
      try {
        await saveOrdersToGitHub(updatedOrders);
        alert('✅ Đã cập nhật trạng thái đơn hàng và lưu vào GitHub!');
        
        // Đợi 2 giây rồi tải lại để đảm bảo đồng bộ
        setTimeout(() => {
          loadOrders();
        }, 2000);
      } catch (error) {
        console.log('Không thể lưu vào GitHub, chỉ lưu localStorage:', error);
        alert('✅ Đã cập nhật trạng thái đơn hàng (lưu localStorage)!');
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
      // Cập nhật state local trước
      setOrders([]);

      // Thử lưu vào GitHub
      try {
        await saveOrdersToGitHub([]);
        alert('✅ Đã xóa tất cả đơn hàng và cập nhật GitHub!');
      } catch (error) {
        console.log('Không thể lưu vào GitHub, lưu vào localStorage:', error);
        // Fallback: Xóa localStorage
        localStorage.removeItem('orders');
        alert('✅ Đã xóa tất cả đơn hàng (localStorage)!');
      }
    } catch (error) {
      console.error('Lỗi xóa đơn hàng:', error);
      alert('❌ Có lỗi xảy ra khi xóa đơn hàng!');
    }
  };

  const saveOrdersToGitHub = async (ordersData: Order[]) => {
    // GitHub API để lưu vào file orders.json
    const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN;
    const REPO_OWNER = 'hoangminhduc13012000';
    const REPO_NAME = 'changemoney';
    const FILE_PATH = 'public/assets/orders.json';

    if (!GITHUB_TOKEN) {
      throw new Error('GitHub token not configured');
    }

    // Lấy file hiện tại để có SHA
    const getResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    let sha = '';
    if (getResponse.ok) {
      const fileData = await getResponse.json();
      sha = fileData.sha;
    }

    // Cập nhật file
    const updateResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Update orders data - ${new Date().toLocaleString('vi-VN')}`,
        content: btoa(JSON.stringify(ordersData, null, 2)),
        sha: sha,
      }),
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update GitHub file');
    }
  };

  const calculateStats = () => {
    const totalOrders = orders.length;
    const completedOrders = orders.filter(order => order.status === 'Hoàn tất').length;
    const pendingOrders = orders.filter(order => order.status === 'Chờ xử lý').length;
    
    const totalRevenue = orders.reduce((sum, order) => {
      if (order.totalFormatted) {
        const amount = parseFloat(order.totalFormatted.replace(/[^\d]/g, ''));
        return sum + (isNaN(amount) ? 0 : amount);
      }
      return sum;
    }, 0);

    const totalDeliveredAmount = orders
      .filter(order => order.status === 'Hoàn tất')
      .reduce((sum, order) => {
        if (order.subtotalFormatted) {
          const amount = parseFloat(order.subtotalFormatted.replace(/[^\d]/g, ''));
          return sum + (isNaN(amount) ? 0 : amount);
        }
        return sum;
      }, 0);

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
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
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
            <p></p>
          </div>
        </div>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
              <strong>📝 Lưu ý:</strong> Dữ liệu được lưu vào GitHub repository và đồng bộ với localStorage. 
              <br />
              <strong>⏰ Quan trọng:</strong> Sau khi cập nhật trạng thái, hãy đợi 10-30 giây rồi nhấn "Tải lại" trên thiết bị khác để thấy thay đổi.
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