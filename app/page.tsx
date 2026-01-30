'use client';

import { useState } from 'react';

// Dữ liệu các mệnh giá tiền Việt Nam với tỷ lệ phí riêng
const denominations = [
  { value: 500000, label: '500,000 VNĐ', color: 'bg-blue-100 border-blue-300', feeRate: 0.03 }, // 3%
  { value: 200000, label: '200,000 VNĐ', color: 'bg-orange-100 border-orange-300', feeRate: 0.04 }, // 4%
  { value: 100000, label: '100,000 VNĐ', color: 'bg-green-100 border-green-300', feeRate: 0.07 }, // 7%
  { value: 50000, label: '50,000 VNĐ', color: 'bg-pink-100 border-pink-300', feeRate: 0.13 }, // 13%
  { value: 20000, label: '20,000 VNĐ', color: 'bg-purple-100 border-purple-300', feeRate: 0.13 }, // 13%
  { value: 10000, label: '10,000 VNĐ', color: 'bg-yellow-100 border-yellow-300', feeRate: 0.12 }, // 12%
];

interface OrderDetails {
  denomination: number;
  quantity: number;
  customerName: string;
  phoneNumber: string;
  address: string;
  note: string;
}

export default function Home() {
  const [selectedDenomination, setSelectedDenomination] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    denomination: 0,
    quantity: 1,
    customerName: '',
    phoneNumber: '',
    address: '',
    note: ''
  });

  const handleDenominationClick = (value: number) => {
    setSelectedDenomination(value);
    setOrderDetails(prev => ({ ...prev, denomination: value }));
  };

  const calculateTotal = () => {
    const subtotal = orderDetails.denomination * orderDetails.quantity;
    
    // Tìm tỷ lệ phí theo mệnh giá
    const denominationInfo = denominations.find(d => d.value === orderDetails.denomination);
    const feeRate = denominationInfo ? denominationInfo.feeRate : 0.12; // Default 12% nếu không tìm thấy
    
    const fee = subtotal * feeRate;
    const total = subtotal + fee;
    return { subtotal, fee, total, feeRate };
  };

  const { subtotal, fee, total, feeRate } = calculateTotal();
  const isValidOrder = total >= 1000000 && orderDetails.customerName.trim() && orderDetails.phoneNumber.trim(); // Tối thiểu 1 triệu và có tên + SĐT

  const handleZaloContact = async () => {
    // Lưu đơn hàng vào file cố định trước khi chuyển đến Zalo
    const success = await saveOrderToFile();
    if (success) {
      window.open('https://zalo.me/0838182780', '_blank');
    }
  };

  const saveOrderToFile = async () => {
    try {
      // Tạo dữ liệu đơn hàng
      const orderData = {
        id: Date.now().toString(),
        createdAt: new Date().toLocaleString('vi-VN'),
        denomination: orderDetails.denomination,
        denominationLabel: formatCurrency(orderDetails.denomination),
        quantity: orderDetails.quantity,
        customerName: orderDetails.customerName,
        phoneNumber: orderDetails.phoneNumber,
        subtotal: subtotal,
        subtotalFormatted: formatCurrency(subtotal),
        fee: fee,
        feeFormatted: formatCurrency(fee),
        feeRate: feeRate,
        feePercentage: Math.round(feeRate * 100),
        total: total,
        totalFormatted: formatCurrency(total),
        address: orderDetails.address,
        note: orderDetails.note || 'Không có',
        status: 'Chờ xử lý'
      };

      try {
        // Thử lưu vào GitHub (cần token)
        await saveToGitHub(orderData);
        alert('✅ Đơn hàng đã được lưu thành công vào GitHub! Mã đơn hàng: ' + orderData.id);
      } catch (error) {
        console.log('Không thể lưu vào GitHub, lưu vào localStorage:', error);
        // Fallback: Lưu vào localStorage
        const existingOrders = localStorage.getItem('orders');
        const orders = existingOrders ? JSON.parse(existingOrders) : [];
        orders.push(orderData);
        localStorage.setItem('orders', JSON.stringify(orders));
        alert('✅ Đơn hàng đã được lưu vào localStorage! Mã đơn hàng: ' + orderData.id);
      }
      
      // Reset form
      setOrderDetails({
        denomination: 0,
        quantity: 1,
        customerName: '',
        phoneNumber: '',
        address: '',
        note: ''
      });
      setSelectedDenomination(null);
      return true;

    } catch (error) {
      console.error('Lỗi khi lưu đơn hàng:', error);
      alert('❌ Có lỗi xảy ra khi lưu đơn hàng. Vui lòng thử lại!');
      return false;
    }
  };

  const saveToGitHub = async (orderData: any) => {
    // GitHub API để lưu vào file orders.json
    const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN; // Cần thiết lập
    const REPO_OWNER = 'hoangminhduc13012000';
    const REPO_NAME = 'changemoney';
    const FILE_PATH = 'public/assets/orders.json';

    if (!GITHUB_TOKEN) {
      throw new Error('GitHub token not configured');
    }

    // Lấy file hiện tại
    const getResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    let existingOrders = [];
    let sha = '';

    if (getResponse.ok) {
      const fileData = await getResponse.json();
      const content = atob(fileData.content);
      existingOrders = JSON.parse(content);
      sha = fileData.sha;
    }

    // Thêm đơn hàng mới
    existingOrders.push(orderData);

    // Cập nhật file
    const updateResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Add new order: ${orderData.id}`,
        content: btoa(JSON.stringify(existingOrders, null, 2)),
        sha: sha,
      }),
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update GitHub file');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-orange-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-4 sm:py-8 shadow-lg">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center flex-1">
              <h1 className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2">🧧 Dịch Vụ Đổi Tiền Lì Xì Tết 🧧</h1>
              <p className="text-sm sm:text-xl opacity-90">Đổi tiền cũ thành mới - Chào đón năm mới thịnh vượng</p>
            </div>
            <div>
              <a
                href="/changemoney/admin/"
                className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-colors text-xs sm:text-sm"
              >
                👨‍💼 Admin
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {!selectedDenomination ? (
          // Trang chính - Hiển thị các mệnh giá
          <div>
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 sm:mb-4">Chọn Mệnh Giá Tiền</h2>
              <p className="text-gray-600 text-base sm:text-lg">Nhấn vào mệnh giá bạn muốn đổi</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 max-w-6xl mx-auto">
              {denominations.map((denom) => (
                <div
                  key={denom.value}
                  onClick={() => handleDenominationClick(denom.value)}
                  className={`${denom.color} p-3 sm:p-6 rounded-xl border-2 cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl`}
                >
                  <div className="text-center">
                    <div className="text-3xl sm:text-6xl mb-2 sm:mb-4">💵</div>
                    <h3 className="text-sm sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2">{denom.label}</h3>
                    <p className="text-xs sm:text-base text-gray-600">Nhấn để đổi tiền</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 sm:mt-12 bg-white rounded-xl shadow-lg p-4 sm:p-8 max-w-4xl mx-auto">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 text-center">📋 Thông Tin Dịch Vụ</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-bold text-blue-800 mb-2 text-sm sm:text-base">💰 Phí Dịch Vụ</h4>
                  <div className="text-gray-700 text-xs sm:text-sm space-y-1">
                    <p>• 500k: 3% phí dịch vụ</p>
                    <p>• 200k: 4% phí dịch vụ</p>
                    <p>• 100k: 7% phí dịch vụ</p>
                    <p>• 50k: 13% phí dịch vụ</p>
                    <p>• 20k: 13% phí dịch vụ</p>
                    <p>• 10k: 12% phí dịch vụ</p>
                  </div>
                </div>
                <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-bold text-green-800 mb-2 text-sm sm:text-base">📊 Đơn Hàng Tối Thiểu</h4>
                  <p className="text-gray-700 text-xs sm:text-sm">1,000,000 VNĐ (bao gồm phí)</p>
                </div>
                <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-bold text-yellow-800 mb-2 text-sm sm:text-base">🚚 Giao Hàng</h4>
                  <p className="text-gray-700 text-xs sm:text-sm">Giao hàng tận nơi trong khu vực Bảo Lộc</p>
                </div>
                <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-bold text-purple-800 mb-2 text-sm sm:text-base">📞 Liên Hệ</h4>
                  <p className="text-gray-700 text-xs sm:text-sm">Zalo: 0838182780</p>
                </div>
              </div>
            </div>  
          </div>
        ) : (
          // Trang chi tiết đơn hàng
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                <h2 className="text-xl sm:text-3xl font-bold text-gray-800">Chi Tiết Đơn Hàng</h2>
                <button
                  onClick={() => setSelectedDenomination(null)}
                  className="bg-gray-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                  ← Quay lại
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                {/* Form đơn hàng */}
                <div>
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-red-100 to-orange-100 rounded-lg">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1 sm:mb-2">
                      💵 Mệnh giá: {formatCurrency(selectedDenomination)}
                    </h3>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-gray-900 font-bold mb-2 text-base sm:text-lg">
                        Tên khách hàng: <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={orderDetails.customerName}
                        onChange={(e) => setOrderDetails(prev => ({ ...prev, customerName: e.target.value }))}
                        className="w-full p-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 font-semibold bg-white placeholder-gray-600 text-sm sm:text-base"
                        placeholder="Nhập họ tên đầy đủ..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-900 font-bold mb-2 text-base sm:text-lg">
                        Số điện thoại: <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="tel"
                        value={orderDetails.phoneNumber}
                        onChange={(e) => setOrderDetails(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        className="w-full p-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 font-semibold bg-white placeholder-gray-600 text-sm sm:text-base"
                        placeholder="Nhập số điện thoại..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-900 font-bold mb-2 text-base sm:text-lg">
                        Số lượng tờ:
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={orderDetails.quantity}
                        onChange={(e) => setOrderDetails(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                        className="w-full p-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 font-semibold bg-white placeholder-gray-500 text-sm sm:text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-900 font-bold mb-2 text-base sm:text-lg">
                        Địa chỉ giao hàng:
                      </label>
                      <textarea
                        value={orderDetails.address}
                        onChange={(e) => setOrderDetails(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full p-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 h-20 sm:h-24 text-gray-900 font-semibold bg-white placeholder-gray-600 text-sm sm:text-base"
                        placeholder="Nhập địa chỉ đầy đủ..."
                      />
                    </div>

                    <div>
                      <label className="block text-gray-900 font-bold mb-2 text-base sm:text-lg">
                        Ghi chú:
                      </label>
                      <textarea
                        value={orderDetails.note}
                        onChange={(e) => setOrderDetails(prev => ({ ...prev, note: e.target.value }))}
                        className="w-full p-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 h-16 sm:h-20 text-gray-900 font-semibold bg-white placeholder-gray-600 text-sm sm:text-base"
                        placeholder="Ghi chú thêm (nếu có)..."
                      />
                    </div>
                  </div>
                </div>

                {/* Tính toán chi phí */}
                <div>
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 sm:p-6 rounded-xl border border-yellow-200">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">💰 Chi Tiết Thanh Toán</h3>
                    
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm sm:text-base">Giá trị tiền đổi:</span>
                        <span className="font-semibold text-sm sm:text-base">{formatCurrency(subtotal)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm sm:text-base">Phí dịch vụ ({Math.round(feeRate * 100)}%):</span>
                        <span className="font-semibold text-orange-600 text-sm sm:text-base">{formatCurrency(fee)}</span>
                      </div>
                      
                      <hr className="border-gray-300" />
                      
                      <div className="flex justify-between text-base sm:text-lg">
                        <span className="font-bold text-gray-800">Tổng thanh toán:</span>
                        <span className="font-bold text-red-600">{formatCurrency(total)}</span>
                      </div>
                    </div>

                    {(!orderDetails.customerName.trim() || !orderDetails.phoneNumber.trim() || !orderDetails.address.trim() || total < 1000000) && (
                      <div className="mt-3 sm:mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                        <p className="text-red-700 text-xs sm:text-sm font-semibold">
                          ⚠️ Vui lòng điền đầy đủ thông tin:
                        </p>
                        <ul className="text-red-600 text-xs sm:text-sm mt-1 ml-4">
                          {!orderDetails.customerName.trim() && <li>• Tên khách hàng</li>}
                          {!orderDetails.phoneNumber.trim() && <li>• Số điện thoại</li>}
                          {!orderDetails.address.trim() && <li>• Địa chỉ giao hàng</li>}
                          {total < 1000000 && <li>• Đơn hàng tối thiểu 1,000,000 VNĐ</li>}
                        </ul>
                      </div>
                    )}

                    <button
                      onClick={handleZaloContact}
                      disabled={!isValidOrder || !orderDetails.address.trim()}
                      className={`w-full mt-4 sm:mt-6 py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-bold text-sm sm:text-lg transition-all duration-300 ${
                        isValidOrder && orderDetails.address.trim()
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      📱 Lưu Đơn & Liên Hệ Zalo: 0838182780
                    </button>
                  </div>

                  <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-bold text-blue-800 mb-2 text-sm sm:text-base">📝 Lưu Ý:</h4>
                    <ul className="text-xs sm:text-sm text-gray-700 space-y-1">
                      <li>• Tiền mới 100% chất lượng</li>
                      <li>• Giao hàng trong ngày</li>
                      <li>• Thanh toán khi nhận hàng</li>
                      <li>• Bảo đảm uy tín, chất lượng</li>
                      <li>• <strong>Đơn hàng sẽ được lưu vào GitHub (hoặc localStorage nếu không có kết nối)</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 sm:py-8 mt-8 sm:mt-12">
        <div className="container mx-auto px-2 sm:px-4 text-center">
          <h3 className="text-lg sm:text-xl font-bold mb-2">🧧 Dịch Vụ Đổi Tiền Lì Xì Tết</h3>
          <p className="text-gray-300 mb-3 sm:mb-4 text-sm sm:text-base">Uy tín - Chất lượng - Giao hàng nhanh</p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <span className="text-yellow-400 text-sm sm:text-base">📞 Hotline:</span>
            <button
              onClick={handleZaloContact}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors text-sm sm:text-base"
            >
              Zalo: 0838182780
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}