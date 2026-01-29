import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const ORDERS_FILE = path.join(process.cwd(), 'public', 'assets', 'orders.json');
const EXCEL_FILE = path.join(process.cwd(), 'public', 'assets', 'orders.xlsx');

// Đọc đơn hàng từ file JSON
function readOrders() {
  if (!fs.existsSync(ORDERS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(ORDERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Lỗi đọc file đơn hàng:', error);
    return [];
  }
}

// Tạo/cập nhật file Excel
function updateExcelFile(orders: any[]) {
  try {
    // Chuyển đổi dữ liệu cho Excel
    const excelData = orders.map((order: any) => ({
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
      'Ghi Chú': order.note || 'Không có',
      'Trạng Thái': order.status
    }));

    // Tạo workbook và worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Tự động điều chỉnh độ rộng cột
    const colWidths = [
      { wch: 15 }, // ID
      { wch: 20 }, // Thời gian
      { wch: 25 }, // Tên khách hàng
      { wch: 15 }, // Số điện thoại
      { wch: 15 }, // Mệnh giá
      { wch: 12 }, // Số lượng
      { wch: 18 }, // Giá trị tiền đổi
      { wch: 12 }, // Tỷ lệ phí
      { wch: 18 }, // Phí dịch vụ
      { wch: 18 }, // Tổng thanh toán
      { wch: 40 }, // Địa chỉ
      { wch: 30 }, // Ghi chú
      { wch: 15 }  // Trạng thái
    ];
    worksheet['!cols'] = colWidths;

    // Thêm worksheet vào workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Đơn Hàng Lì Xì');

    // Lưu file Excel
    XLSX.writeFile(workbook, EXCEL_FILE);
    
    return true;
  } catch (error) {
    console.error('Lỗi tạo file Excel:', error);
    return false;
  }
}

// GET - Xuất Excel và cập nhật file cố định
export async function GET() {
  try {
    const orders = readOrders();
    
    // Cập nhật file Excel cố định
    const updated = updateExcelFile(orders);
    
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Lỗi khi tạo file Excel' },
        { status: 500 }
      );
    }

    // Đọc file Excel đã tạo
    const excelBuffer = fs.readFileSync(EXCEL_FILE);

    // Tạo tên file với ngày hiện tại
    const fileName = `don-hang-li-xi-${new Date().toISOString().split('T')[0]}.xlsx`;

    // Trả về file Excel
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Lỗi xuất Excel:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi xuất file Excel' },
      { status: 500 }
    );
  }
}

// POST - Cập nhật file Excel cố định (không tải về)
export async function POST() {
  try {
    const orders = readOrders();
    const updated = updateExcelFile(orders);
    
    if (updated) {
      return NextResponse.json({ 
        success: true, 
        message: 'File Excel đã được cập nhật',
        filePath: '/assets/orders.xlsx'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Lỗi khi cập nhật file Excel' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Lỗi cập nhật Excel:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi cập nhật file Excel' },
      { status: 500 }
    );
  }
}