import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ORDERS_FILE = path.join(process.cwd(), 'public', 'assets', 'orders.json');

// Đảm bảo file tồn tại
function ensureOrdersFile() {
  const dir = path.dirname(ORDERS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, '[]', 'utf8');
  }
}

// Đọc đơn hàng từ file
function readOrders() {
  ensureOrdersFile();
  try {
    const data = fs.readFileSync(ORDERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Lỗi đọc file đơn hàng:', error);
    return [];
  }
}

// Lưu đơn hàng vào file
function saveOrders(orders: any[]) {
  ensureOrdersFile();
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Lỗi lưu file đơn hàng:', error);
    return false;
  }
}

// GET - Lấy tất cả đơn hàng
export async function GET() {
  try {
    const orders = readOrders();
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Lỗi khi lấy danh sách đơn hàng' },
      { status: 500 }
    );
  }
}

// POST - Thêm đơn hàng mới
export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();
    
    // Validate dữ liệu đơn hàng
    if (!orderData.denomination || !orderData.quantity || !orderData.customerName || !orderData.phoneNumber || !orderData.address) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc (tên, số điện thoại, địa chỉ)' },
        { status: 400 }
      );
    }

    // Tạo đơn hàng với ID và thời gian
    const newOrder = {
      id: Date.now().toString(),
      createdAt: new Date().toLocaleString('vi-VN'),
      ...orderData,
      status: 'Chờ xử lý'
    };

    // Đọc đơn hàng hiện có và thêm đơn mới
    const orders = readOrders();
    orders.push(newOrder);

    // Lưu vào file
    const saved = saveOrders(orders);
    
    if (saved) {
      return NextResponse.json({ 
        success: true, 
        message: 'Đơn hàng đã được lưu thành công',
        orderId: newOrder.id
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Lỗi khi lưu đơn hàng' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Lỗi API POST orders:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi server khi xử lý đơn hàng' },
      { status: 500 }
    );
  }
}

// PUT - Cập nhật trạng thái đơn hàng
export async function PUT(request: NextRequest) {
  try {
    const { orderId, status } = await request.json();
    
    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: 'Thiếu orderId hoặc status' },
        { status: 400 }
      );
    }

    // Đọc đơn hàng hiện có
    const orders = readOrders();
    
    // Tìm và cập nhật đơn hàng
    const orderIndex = orders.findIndex((order: any) => order.id === orderId);
    
    if (orderIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      );
    }

    // Cập nhật trạng thái
    orders[orderIndex].status = status;
    orders[orderIndex].updatedAt = new Date().toLocaleString('vi-VN');

    // Lưu vào file
    const saved = saveOrders(orders);
    
    if (saved) {
      return NextResponse.json({ 
        success: true, 
        message: 'Đã cập nhật trạng thái đơn hàng',
        order: orders[orderIndex]
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Lỗi khi lưu đơn hàng' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Lỗi API PUT orders:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi server khi cập nhật đơn hàng' },
      { status: 500 }
    );
  }
}

// DELETE - Xóa tất cả đơn hàng
export async function DELETE() {
  try {
    const saved = saveOrders([]);
    if (saved) {
      return NextResponse.json({ 
        success: true, 
        message: 'Đã xóa tất cả đơn hàng' 
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Lỗi khi xóa đơn hàng' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Lỗi server khi xóa đơn hàng' },
      { status: 500 }
    );
  }
}