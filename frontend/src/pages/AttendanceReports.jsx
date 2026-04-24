import { useState, useEffect, useCallback } from "react";
import { FaDownload, FaFileExcel, FaFilePdf, FaSearch, FaFilter } from "react-icons/fa";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { useSystemConfig } from "../contexts/SystemConfigContext";
import { useSocket } from "../context/SocketContext";
import api from "../api/axiosConfig";

export default function AttendanceReports() {
  const [reportType, setReportType] = useState("employee");
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: ""
  });
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [departments, setDepartments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [statusFilters, setStatusFilters] = useState({
    Present: true,
    Late: true,
    Absent: true,
    Overtime: true,
    'Missed Clock-out': true
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "admin";
  const isSupervisor = user.role === "supervisor";
  const { systemConfig } = useSystemConfig();
  const { socket, connected } = useSocket();

  // Initial data fetch
  useEffect(() => {
    if (reportType === "employee") {
      fetchEmployees();
      fetchDepartments();
    } else if (reportType === "attendance" && isAdmin) {
      fetchAttendanceData();
    }
  }, [reportType, isAdmin]);

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!socket || !connected) return;

    console.log("🔌 Setting up real-time listeners for reports");

    // Listen for employee updates
    const handleEmployeeUpdate = (data) => {
      console.log("👤 Employee update received:", data);
      if (reportType === "employee") {
        fetchEmployees();
      }
    };

    // Listen for attendance updates
    const handleAttendanceUpdate = (data) => {
      console.log("📊 Attendance update received:", data);
      if (reportType === "attendance" && isAdmin) {
        fetchAttendanceData();
      }
    };

    // Listen for department updates
    const handleDepartmentUpdate = (data) => {
      console.log("🏢 Department update received:", data);
      fetchDepartments();
    };

    // Register event listeners
    socket.on('employee_created', handleEmployeeUpdate);
    socket.on('employee_updated', handleEmployeeUpdate);
    socket.on('employee_deleted', handleEmployeeUpdate);
    socket.on('attendance_recorded', handleAttendanceUpdate);
    socket.on('attendance_updated', handleAttendanceUpdate);
    socket.on('department_created', handleDepartmentUpdate);
    socket.on('department_updated', handleDepartmentUpdate);
    socket.on('department_deleted', handleDepartmentUpdate);

    // Cleanup listeners on unmount
    return () => {
      socket.off('employee_created', handleEmployeeUpdate);
      socket.off('employee_updated', handleEmployeeUpdate);
      socket.off('employee_deleted', handleEmployeeUpdate);
      socket.off('attendance_recorded', handleAttendanceUpdate);
      socket.off('attendance_updated', handleAttendanceUpdate);
      socket.off('department_created', handleDepartmentUpdate);
      socket.off('department_updated', handleDepartmentUpdate);
      socket.off('department_deleted', handleDepartmentUpdate);
    };
  }, [socket, connected, reportType, isAdmin]);

  // Periodic refresh as fallback (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("🔄 Periodic refresh triggered");
      if (reportType === "employee") {
        fetchEmployees();
      } else if (reportType === "attendance" && isAdmin) {
        fetchAttendanceData();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [reportType, isAdmin]);

  // Fetch attendance data when date filters change
  useEffect(() => {
    if (reportType === "attendance" && isAdmin) {
      fetchAttendanceData();
    }
  }, [dateFilter.startDate, dateFilter.endDate]);

  const fetchEmployees = useCallback(async () => {
    if (reportType !== "employee") return;
    
    setLoading(true);
    try {
      console.log("🔍 Fetching employees...");
      const response = await api.get("/employees");
      
      console.log("📡 Employee response received");
      console.log("📊 Employee data received:", response.data);
      // The backend returns employees directly as an array
      setEmployees(Array.isArray(response.data) ? response.data : []);
      console.log("✅ Employees set:", Array.isArray(response.data) ? response.data.length : 0, "employees");
    } catch (error) {
      console.error("❌ Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  }, [reportType]);

  const fetchDepartments = useCallback(async () => {
    try {
      console.log("🔍 Fetching departments...");
      const response = await api.get("/departments");
      
      console.log("📡 Department response received");
      console.log("📊 Department data received:", response.data);
      setDepartments(response.data || []);
      console.log("✅ Departments set:", response.data?.length || 0, "departments");
    } catch (error) {
      console.error("❌ Error fetching departments:", error);
    }
  }, []);

  const fetchAttendanceData = useCallback(async () => {
    if (reportType !== "attendance" || !isAdmin) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (dateFilter.startDate) params.append("start_date", dateFilter.startDate);
      if (dateFilter.endDate) params.append("end_date", dateFilter.endDate);
      if (departmentFilter) params.append("department", departmentFilter);
      
      console.log("🔍 Fetching attendance data with params:", params.toString());
      
      const response = await api.get(`/attendances?${params.toString()}`);
      
      console.log("📡 Attendance response received");
      console.log("📊 Attendance data received:", response.data);
      // The backend returns attendance data directly as an array
      setAttendanceData(Array.isArray(response.data) ? response.data : []);
      console.log("✅ Attendance data set:", Array.isArray(response.data) ? response.data.length : 0, "records");
    } catch (error) {
      console.error("❌ Error fetching attendance data:", error);
    } finally {
      setLoading(false);
    }
  }, [reportType, isAdmin, dateFilter.startDate, dateFilter.endDate, departmentFilter]);

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !departmentFilter || employee.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  const filteredAttendance = attendanceData.filter(record => {
    const matchesSearch = record.employee?.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.employee?.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.employee?.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()); // Also check direct employee_id field
    const matchesStatus = statusFilters[record.status] === true;
    return matchesSearch && matchesStatus;
  });

  // Helper function to format time in 24-hour format
  const formatTime = (timeString) => {
    if (!timeString || timeString === "N/A") return "N/A";
    
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return "N/A";
      
      // Format as HH:MM in 24-hour format
      return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return "N/A";
    }
  };

  // Helper function to convert hex color to RGB for jsPDF
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [30, 58, 138]; // Default blue color
  };

  const getCurrentPageData = (data) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (data) => Math.ceil(data.length / itemsPerPage);

  const generateEmployeePDF = () => {
    const doc = new jsPDF();
    const primaryColor = hexToRgb(systemConfig.primaryColor || '#1E3A8A');
    
    // Company Header with colored background
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 35, 'F'); // Full width colored header
    
    // Company Name
    doc.setTextColor(255, 255, 255); // White text
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text(systemConfig.companyName || systemConfig.systemName || 'SecureAttend', 20, 15);
    
    // Report Title
    doc.setFontSize(20);
    doc.text("Employee List Report", 20, 25);
    
    // Reset text color to black for rest of document
    doc.setTextColor(0, 0, 0);
    
    // Date
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 45);
    doc.text(`Total Employees: ${filteredEmployees.length}`, 20, 52);
    
    // Table headers with colored background
    const headers = ["ID", "Name", "Department", "Position", "Status"];
    const startY = 65;
    let currentY = startY;
    
    // Header background
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(20, currentY - 8, 170, 12, 'F');
    
    // Header text
    doc.setTextColor(255, 255, 255); // White text for headers
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text(headers[0], 25, currentY);
    doc.text(headers[1], 50, currentY);
    doc.text(headers[2], 100, currentY);
    doc.text(headers[3], 140, currentY);
    doc.text(headers[4], 170, currentY);
    
    currentY += 15;
    
    // Reset text color for data rows
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    
    // Data rows
    filteredEmployees.forEach((employee, index) => {
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }
      
      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252); // Light gray
        doc.rect(20, currentY - 6, 170, 10, 'F');
      }
      
      const name = `${employee.firstname || ""} ${employee.lastname || ""}`.trim();
      const department = employee.department || "N/A";
      const position = employee.position || "N/A";
      const status = employee.status || "Active";
      
      doc.text(employee.employee_id || "", 25, currentY);
      doc.text(name.substring(0, 20), 50, currentY);
      doc.text(department.substring(0, 15), 100, currentY);
      doc.text(position.substring(0, 12), 140, currentY);
      doc.text(status, 170, currentY);
      
      currentY += 10;
    });
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Report generated by ${systemConfig.systemName || 'SecureAttend'}`, 20, currentY + 15);
    
    doc.save("employee-list-report.pdf");
  };

  const generateAttendancePDF = () => {
    const doc = new jsPDF();
    const primaryColor = hexToRgb(systemConfig.primaryColor || '#1E3A8A');
    
    // Company Header with colored background
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 35, 'F'); // Full width colored header
    
    // Company Name
    doc.setTextColor(255, 255, 255); // White text
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text(systemConfig.companyName || systemConfig.systemName || 'SecureAttend', 20, 15);
    
    // Report Title
    doc.setFontSize(20);
    doc.text("Attendance Report", 20, 25);
    
    // Reset text color to black for rest of document
    doc.setTextColor(0, 0, 0);
    
    // Date range and info
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 45);
    if (dateFilter.startDate && dateFilter.endDate) {
      doc.text(`Period: ${dateFilter.startDate} to ${dateFilter.endDate}`, 20, 52);
    }
    doc.text(`Total Records: ${filteredAttendance.length}`, 20, 59);
    
    // Table headers with colored background
    const headers = ["ID", "Employee", "Date", "Clock In", "Clock Out", "Status"];
    const startY = 75;
    let currentY = startY;
    
    // Header background
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(20, currentY - 8, 170, 12, 'F');
    
    // Header text
    doc.setTextColor(255, 255, 255); // White text for headers
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text(headers[0], 25, currentY);
    doc.text(headers[1], 50, currentY);
    doc.text(headers[2], 90, currentY);
    doc.text(headers[3], 120, currentY);
    doc.text(headers[4], 145, currentY);
    doc.text(headers[5], 170, currentY);
    
    currentY += 15;
    
    // Reset text color for data rows
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    
    // Data rows
    filteredAttendance.forEach((record, index) => {
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }
      
      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252); // Light gray
        doc.rect(20, currentY - 6, 170, 10, 'F');
      }
      
      const employeeId = record.employee?.employee_id || "N/A";
      const employeeName = `${record.employee?.firstname || ""} ${record.employee?.lastname || ""}`.trim();
      const date = new Date(record.date).toLocaleDateString();
      const timeIn = formatTime(record.clock_in);
      const timeOut = formatTime(record.clock_out);
      const status = record.status || "N/A";
      
      doc.text(employeeId.substring(0, 10), 25, currentY);
      doc.text(employeeName.substring(0, 15), 50, currentY);
      doc.text(date, 90, currentY);
      doc.text(timeIn.substring(0, 8), 120, currentY);
      doc.text(timeOut.substring(0, 8), 145, currentY);
      doc.text(status, 170, currentY);
      
      currentY += 10;
    });
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Report generated by ${systemConfig.systemName || 'SecureAttend'}`, 20, currentY + 15);
    
    doc.save("attendance-report.pdf");
  };

  const generateEmployeeExcel = async () => {
    const companyName = (systemConfig.companyName || systemConfig.systemName || "TOPLIS SOLUTIONS, INC.").toUpperCase();
    const systemName  = systemConfig.systemName || "SecureAttend";
    const now         = new Date();
    const dateStr     = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const timeStr     = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const deptLabel   = departmentFilter || "All Departments";

    // ── Palette ──────────────────────────────────────────────────────────────
    const DARK_GREEN  = "1E3A8A";   // header bg  (primary blue)
    const MID_GREEN   = "2D4FA3";   // sub-header / section titles
    const LIGHT_GREEN = "EEF2FF";   // zebra even rows
    const WHITE       = "FFFFFF";
    const ACTIVE_FG   = "166534";   // Active text
    const ACTIVE_BG   = "DCFCE7";   // Active cell bg
    const INACTIVE_FG = "991B1B";   // Inactive text
    const INACTIVE_BG = "FEE2E2";   // Inactive cell bg
    const BORDER_CLR  = "C7D2E8";
    const SUMMARY_BG  = "EEF2FF";
    const FOOTER_FG   = "6B7280";

    // ── Helpers ───────────────────────────────────────────────────────────────
    const thinBorder = (color = BORDER_CLR) => ({
      top:    { style: "thin", color: { argb: "FF" + color } },
      bottom: { style: "thin", color: { argb: "FF" + color } },
      left:   { style: "thin", color: { argb: "FF" + color } },
      right:  { style: "thin", color: { argb: "FF" + color } },
    });

    const applyStyle = (cell, style) => Object.assign(cell, style);

    // ── Workbook / Sheet ──────────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator  = systemName;
    wb.created  = now;
    wb.modified = now;

    const ws = wb.addWorksheet("Employee List", {
      pageSetup: {
        paperSize:   9,          // A4
        orientation: "landscape",
        fitToPage:   true,
        fitToWidth:  1,
        fitToHeight: 0,
        margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
      },
      views: [{ state: "frozen", ySplit: 10 }], // freeze above data rows
    });

    // ── Column definitions ────────────────────────────────────────────────────
    ws.columns = [
      { key: "empId",   width: 14 },
      { key: "fname",   width: 16 },
      { key: "lname",   width: 16 },
      { key: "full",    width: 24 },
      { key: "dept",    width: 20 },
      { key: "pos",     width: 22 },
      { key: "status",  width: 12 },
      { key: "email",   width: 30 },
      { key: "phone",   width: 16 },
    ];
    const LAST_COL = 9; // I

    // ── Row 1 – Company Name ──────────────────────────────────────────────────
    const r1 = ws.addRow([companyName]);
    ws.mergeCells(1, 1, 1, LAST_COL);
    applyStyle(r1.getCell(1), {
      value: companyName,
      font:      { name: "Calibri", bold: true, size: 18, color: { argb: "FF" + WHITE } },
      fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + DARK_GREEN } },
      alignment: { horizontal: "center", vertical: "middle" },
    });
    r1.height = 36;

    // ── Row 2 – Report Subtitle ───────────────────────────────────────────────
    const r2 = ws.addRow(["Employee List Report"]);
    ws.mergeCells(2, 1, 2, LAST_COL);
    applyStyle(r2.getCell(1), {
      value: "Employee List Report",
      font:      { name: "Calibri", bold: true, size: 14, color: { argb: "FF" + WHITE } },
      fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + MID_GREEN } },
      alignment: { horizontal: "center", vertical: "middle" },
    });
    r2.height = 26;

    // ── Row 3 – Spacer ────────────────────────────────────────────────────────
    ws.addRow([]);

    // ── Rows 4-6 – Meta info (two-column layout) ──────────────────────────────
    const metaStyle = (cell) => {
      cell.font      = { name: "Calibri", size: 10 };
      cell.alignment = { vertical: "middle" };
    };
    const metaLabelStyle = (cell) => {
      cell.font      = { name: "Calibri", bold: true, size: 10, color: { argb: "FF" + MID_GREEN } };
      cell.alignment = { vertical: "middle" };
    };

    // Row 4
    const r4 = ws.addRow([]);
    r4.height = 18;
    const r4c1 = r4.getCell(1); r4c1.value = "Generated Date:";  metaLabelStyle(r4c1);
    const r4c2 = r4.getCell(2); r4c2.value = `${dateStr}  ${timeStr}`; metaStyle(r4c2);
    ws.mergeCells(4, 2, 4, 5);
    const r4c6 = r4.getCell(6); r4c6.value = "Total Employees:"; metaLabelStyle(r4c6);
    const r4c7 = r4.getCell(7); r4c7.value = filteredEmployees.length; metaStyle(r4c7);

    // Row 5
    const r5 = ws.addRow([]);
    r5.height = 18;
    const r5c1 = r5.getCell(1); r5c1.value = "Department Filter:"; metaLabelStyle(r5c1);
    const r5c2 = r5.getCell(2); r5c2.value = deptLabel; metaStyle(r5c2);
    ws.mergeCells(5, 2, 5, 5);

    // ── Row 6 – Spacer ────────────────────────────────────────────────────────
    ws.addRow([]);

    // ── Row 7 – Table Header ──────────────────────────────────────────────────
    const HEADERS = ["Employee ID", "First Name", "Last Name", "Full Name", "Department", "Position", "Status", "Email", "Phone"];
    const rH = ws.addRow(HEADERS);
    rH.height = 22;
    rH.eachCell((cell) => {
      cell.font      = { name: "Calibri", bold: true, size: 11, color: { argb: "FF" + WHITE } };
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + DARK_GREEN } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: false };
      cell.border    = thinBorder("2E7D52");
    });

    // ── Data Rows ─────────────────────────────────────────────────────────────
    const employeeData = filteredEmployees.map(e => ({
      empId:  e.employee_id || "",
      fname:  e.firstname   || "",
      lname:  e.lastname    || "",
      full:   `${e.firstname || ""} ${e.lastname || ""}`.trim(),
      dept:   e.department  || "N/A",
      pos:    e.position    || "N/A",
      status: e.status      || "Active",
      email:  e.email       || "",
      phone:  e.contact_number || e.phone || "",
    }));

    employeeData.forEach((emp, idx) => {
      const isEven  = idx % 2 === 0;
      const rowBg   = isEven ? LIGHT_GREEN : WHITE;
      const dr      = ws.addRow([emp.empId, emp.fname, emp.lname, emp.full, emp.dept, emp.pos, emp.status, emp.email, emp.phone]);
      dr.height     = 18;

      dr.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.font      = { name: "Calibri", size: 10 };
        cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + rowBg } };
        cell.border    = thinBorder();
        cell.alignment = { vertical: "middle", horizontal: [1, 2, 3, 4, 8].includes(colNum) ? "left" : "center" };
      });

      // Status cell – conditional colour
      const statusCell = dr.getCell(7);
      const statusVal  = (emp.status || "").toLowerCase();
      if (statusVal === "active") {
        statusCell.font = { name: "Calibri", bold: true, size: 10, color: { argb: "FF" + ACTIVE_FG } };
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + ACTIVE_BG } };
      } else if (statusVal === "inactive") {
        statusCell.font = { name: "Calibri", bold: true, size: 10, color: { argb: "FF" + INACTIVE_FG } };
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + INACTIVE_BG } };
      }
    });

    // ── Spacer after data ─────────────────────────────────────────────────────
    ws.addRow([]);

    // ── Summary Section ───────────────────────────────────────────────────────
    const activeCount   = employeeData.filter(e => e.status.toLowerCase() === "active").length;
    const inactiveCount = employeeData.filter(e => e.status.toLowerCase() === "inactive").length;

    const deptCounts = employeeData.reduce((acc, e) => {
      acc[e.dept] = (acc[e.dept] || 0) + 1;
      return acc;
    }, {});

    const sectionHeaderStyle = (cell, label) => {
      cell.value     = label;
      cell.font      = { name: "Calibri", bold: true, size: 11, color: { argb: "FF" + WHITE } };
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + MID_GREEN } };
      cell.alignment = { horizontal: "left", vertical: "middle" };
      cell.border    = thinBorder("2E7D52");
    };

    const summaryLabelStyle = (cell) => {
      cell.font      = { name: "Calibri", bold: true, size: 10 };
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + SUMMARY_BG } };
      cell.alignment = { horizontal: "left", vertical: "middle" };
      cell.border    = thinBorder();
    };

    const summaryValueStyle = (cell) => {
      cell.font      = { name: "Calibri", size: 10 };
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + SUMMARY_BG } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border    = thinBorder();
    };

    // Summary header row
    const sumHdrRow = ws.addRow([]);
    sumHdrRow.height = 20;
    const sumHdrCell = sumHdrRow.getCell(1);
    sectionHeaderStyle(sumHdrCell, "SUMMARY");
    ws.mergeCells(sumHdrRow.number, 1, sumHdrRow.number, 4);

    // Summary data rows
    const summaryRows = [
      ["Total Employees",   filteredEmployees.length],
      ["Active Employees",  activeCount],
      ["Inactive Employees", inactiveCount],
    ];
    summaryRows.forEach(([label, value]) => {
      const sr = ws.addRow([]);
      sr.height = 18;
      const lc = sr.getCell(1); lc.value = label; summaryLabelStyle(lc);
      ws.mergeCells(sr.number, 1, sr.number, 3);
      const vc = sr.getCell(4); vc.value = value; summaryValueStyle(vc);
    });

    // Spacer
    ws.addRow([]);

    // Department Breakdown header
    const deptHdrRow = ws.addRow([]);
    deptHdrRow.height = 20;
    const deptHdrCell = deptHdrRow.getCell(1);
    sectionHeaderStyle(deptHdrCell, "DEPARTMENT BREAKDOWN");
    ws.mergeCells(deptHdrRow.number, 1, deptHdrRow.number, 4);

    // Dept column sub-headers
    const deptColHdr = ws.addRow([]);
    deptColHdr.height = 18;
    ["Department", "", "", "Employees"].forEach((h, i) => {
      const c = deptColHdr.getCell(i + 1);
      c.value     = h;
      c.font      = { name: "Calibri", bold: true, size: 10, color: { argb: "FF" + WHITE } };
      c.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + DARK_GREEN } };
      c.alignment = { horizontal: i === 3 ? "center" : "left", vertical: "middle" };
      c.border    = thinBorder("2E7D52");
    });
    ws.mergeCells(deptColHdr.number, 1, deptColHdr.number, 3);

    Object.entries(deptCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([dept, count], idx) => {
        const dr = ws.addRow([]);
        dr.height = 18;
        const isEven = idx % 2 === 0;
        const bg = isEven ? SUMMARY_BG : WHITE;

        const dc = dr.getCell(1);
        dc.value     = dept;
        dc.font      = { name: "Calibri", size: 10 };
        dc.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bg } };
        dc.alignment = { horizontal: "left", vertical: "middle" };
        dc.border    = thinBorder();
        ws.mergeCells(dr.number, 1, dr.number, 3);

        const cc = dr.getCell(4);
        cc.value     = count;
        cc.font      = { name: "Calibri", size: 10 };
        cc.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bg } };
        cc.alignment = { horizontal: "center", vertical: "middle" };
        cc.border    = thinBorder();
      });

    // ── Spacer ────────────────────────────────────────────────────────────────
    ws.addRow([]);

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerRow = ws.addRow([`Report generated by ${systemName}  •  ${dateStr} at ${timeStr}`]);
    ws.mergeCells(footerRow.number, 1, footerRow.number, LAST_COL);
    const footerCell = footerRow.getCell(1);
    footerCell.font      = { name: "Calibri", italic: true, size: 9, color: { argb: "FF" + FOOTER_FG } };
    footerCell.alignment = { horizontal: "center", vertical: "middle" };
    footerRow.height     = 16;

    // ── Print area & page setup ───────────────────────────────────────────────
    ws.headerFooter.oddFooter = `&C&"Calibri,Italic"&9Report generated by ${systemName}  •  Page &P of &N`;

    // ── Save ──────────────────────────────────────────────────────────────────
    const timestamp = now.toISOString().slice(0, 10);
    const filename  = `${(systemConfig.companyName || "Company").replace(/\s+/g, "-")}-Employee-List-${timestamp}.xlsx`;

    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement("a");
    a.href       = url;
    a.download   = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateAttendanceExcel = async () => {
    const companyName  = (systemConfig.companyName || systemConfig.systemName || "TOPLIS SOLUTIONS, INC.").toUpperCase();
    const systemName   = systemConfig.systemName || "SecureAttend";
    const now          = new Date();
    const dateStr      = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const timeStr      = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const periodLabel  = dateFilter.startDate && dateFilter.endDate
      ? `${dateFilter.startDate}  →  ${dateFilter.endDate}`
      : "All Records";

    // ── Palette ──────────────────────────────────────────────────────────────
    const DARK_BLUE   = "1E3A8A";
    const MID_BLUE    = "2D4FA3";
    const LIGHT_BLUE  = "EEF2FF";
    const WHITE       = "FFFFFF";
    const BORDER_CLR  = "C7D2E8";
    const SUMMARY_BG  = "EEF2FF";
    const FOOTER_FG   = "6B7280";

    // Status colours
    const STATUS_STYLES = {
      "Present":          { fg: "166534", bg: "DCFCE7" },   // green
      "Absent":           { fg: "991B1B", bg: "FEE2E2" },   // red
      "Late":             { fg: "92400E", bg: "FEF3C7" },   // orange/amber
      "Overtime":         { fg: "1E3A8A", bg: "DBEAFE" },   // blue
      "Missed Clock-out": { fg: "854D0E", bg: "FEF9C3" },   // yellow
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    const thinBorder = (color = BORDER_CLR) => ({
      top:    { style: "thin", color: { argb: "FF" + color } },
      bottom: { style: "thin", color: { argb: "FF" + color } },
      left:   { style: "thin", color: { argb: "FF" + color } },
      right:  { style: "thin", color: { argb: "FF" + color } },
    });

    const fmt24 = (timeString) => {
      if (!timeString || timeString === "N/A") return "-";
      try {
        const d = new Date(timeString);
        if (isNaN(d.getTime())) return "-";
        return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
      } catch { return "-"; }
    };

    // ── Workbook / Sheet ──────────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator  = systemName;
    wb.created  = now;
    wb.modified = now;

    const ws = wb.addWorksheet("Attendance Report", {
      pageSetup: {
        paperSize:   9,
        orientation: "landscape",
        fitToPage:   true,
        fitToWidth:  1,
        fitToHeight: 0,
        margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
      },
      views: [{ state: "frozen", ySplit: 9 }],
    });

    const LAST_COL = 8; // H

    // ── Column widths ─────────────────────────────────────────────────────────
    ws.columns = [
      { key: "empId",   width: 14 },
      { key: "name",    width: 22 },
      { key: "dept",    width: 20 },
      { key: "date",    width: 14 },
      { key: "clockIn", width: 12 },
      { key: "clockOut",width: 12 },
      { key: "status",  width: 18 },
      { key: "hours",   width: 14 },
    ];

    // ── Row 1 – Company Name ──────────────────────────────────────────────────
    const r1 = ws.addRow([companyName]);
    ws.mergeCells(1, 1, 1, LAST_COL);
    const r1c1 = r1.getCell(1);
    r1c1.value     = companyName;
    r1c1.font      = { name: "Calibri", bold: true, size: 18, color: { argb: "FF" + WHITE } };
    r1c1.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + DARK_BLUE } };
    r1c1.alignment = { horizontal: "center", vertical: "middle" };
    r1.height      = 36;

    // ── Row 2 – Report Subtitle ───────────────────────────────────────────────
    const r2 = ws.addRow(["Attendance Report"]);
    ws.mergeCells(2, 1, 2, LAST_COL);
    const r2c1 = r2.getCell(1);
    r2c1.value     = "Attendance Report";
    r2c1.font      = { name: "Calibri", bold: true, size: 14, color: { argb: "FF" + WHITE } };
    r2c1.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + MID_BLUE } };
    r2c1.alignment = { horizontal: "center", vertical: "middle" };
    r2.height      = 26;

    // ── Row 3 – Spacer ────────────────────────────────────────────────────────
    ws.addRow([]);

    // ── Meta helpers ──────────────────────────────────────────────────────────
    const metaLabel = (cell, text) => {
      cell.value     = text;
      cell.font      = { name: "Calibri", bold: true, size: 10, color: { argb: "FF" + MID_BLUE } };
      cell.alignment = { vertical: "middle" };
    };
    const metaValue = (cell, text) => {
      cell.value     = text;
      cell.font      = { name: "Calibri", size: 10 };
      cell.alignment = { vertical: "middle" };
    };

    // ── Row 4 – Generated Date + Total Records ────────────────────────────────
    const r4 = ws.addRow([]); r4.height = 18;
    metaLabel(r4.getCell(1), "Generated Date:");
    metaValue(r4.getCell(2), `${dateStr}  ${timeStr}`);
    ws.mergeCells(4, 2, 4, 4);
    metaLabel(r4.getCell(5), "Total Records:");
    metaValue(r4.getCell(6), filteredAttendance.length);

    // ── Row 5 – Report Period ─────────────────────────────────────────────────
    const r5 = ws.addRow([]); r5.height = 18;
    metaLabel(r5.getCell(1), "Report Period:");
    metaValue(r5.getCell(2), periodLabel);
    ws.mergeCells(5, 2, 5, 4);

    // ── Row 6 – Spacer ────────────────────────────────────────────────────────
    ws.addRow([]);

    // ── Row 7 – Table Header ──────────────────────────────────────────────────
    const HEADERS = ["Employee ID", "Employee Name", "Department", "Date", "Clock In", "Clock Out", "Status", "Hours Worked"];
    const rH = ws.addRow(HEADERS);
    rH.height = 22;
    rH.eachCell((cell) => {
      cell.font      = { name: "Calibri", bold: true, size: 11, color: { argb: "FF" + WHITE } };
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + DARK_BLUE } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border    = thinBorder(MID_BLUE);
    });

    // ── Data Rows ─────────────────────────────────────────────────────────────
    const totalHours = filteredAttendance.reduce((sum, r) => sum + (parseFloat(r.total_hours) || 0), 0);

    filteredAttendance.forEach((record, idx) => {
      const isEven  = idx % 2 === 0;
      const rowBg   = isEven ? LIGHT_BLUE : WHITE;

      const empId   = record.employee?.employee_id || "-";
      const name    = `${record.employee?.firstname || ""} ${record.employee?.lastname || ""}`.trim() || "-";
      const dept    = record.employee?.department || "-";
      const date    = record.date ? new Date(record.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" }) : "-";
      const clockIn = fmt24(record.clock_in);
      const clockOut= fmt24(record.clock_out);
      const status  = record.status || "-";
      const hours   = record.total_hours ? parseFloat(record.total_hours).toFixed(2) : "-";

      const dr = ws.addRow([empId, name, dept, date, clockIn, clockOut, status, hours]);
      dr.height = 18;

      dr.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.font      = { name: "Calibri", size: 10 };
        cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + rowBg } };
        cell.border    = thinBorder();
        // Left-align name & dept; center everything else
        cell.alignment = { vertical: "middle", horizontal: [2, 3].includes(colNum) ? "left" : "center" };
      });

      // Status conditional formatting
      const statusCell = dr.getCell(7);
      const style = STATUS_STYLES[status];
      if (style) {
        statusCell.font = { name: "Calibri", bold: true, size: 10, color: { argb: "FF" + style.fg } };
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + style.bg } };
      }
    });

    // ── Spacer ────────────────────────────────────────────────────────────────
    ws.addRow([]);

    // ── Summary Section ───────────────────────────────────────────────────────
    const avgHours = filteredAttendance.length > 0
      ? (totalHours / filteredAttendance.length).toFixed(2)
      : "0.00";

    const sectionHdr = (row, label, colSpan) => {
      const cell = row.getCell(1);
      cell.value     = label;
      cell.font      = { name: "Calibri", bold: true, size: 11, color: { argb: "FF" + WHITE } };
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + MID_BLUE } };
      cell.alignment = { horizontal: "left", vertical: "middle" };
      cell.border    = thinBorder(MID_BLUE);
      ws.mergeCells(row.number, 1, row.number, colSpan);
      row.height = 20;
    };

    const summaryLbl = (cell, text) => {
      cell.value     = text;
      cell.font      = { name: "Calibri", bold: true, size: 10, color: { argb: "FF" + MID_BLUE } };
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + SUMMARY_BG } };
      cell.alignment = { horizontal: "left", vertical: "middle" };
      cell.border    = thinBorder();
    };

    const summaryVal = (cell, val) => {
      cell.value     = val;
      cell.font      = { name: "Calibri", bold: true, size: 10 };
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + SUMMARY_BG } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border    = thinBorder();
    };

    // Summary header
    const sumHdrRow = ws.addRow([]);
    sectionHdr(sumHdrRow, "SUMMARY", 4);

    // Summary rows
    [
      ["Total Attendance Records", filteredAttendance.length],
      ["Total Hours Worked",       `${totalHours.toFixed(2)} hrs`],
      ["Average Hours per Record", `${avgHours} hrs`],
    ].forEach(([label, value]) => {
      const sr = ws.addRow([]); sr.height = 18;
      summaryLbl(sr.getCell(1), label);
      ws.mergeCells(sr.number, 1, sr.number, 3);
      summaryVal(sr.getCell(4), value);
    });

    // ── Spacer ────────────────────────────────────────────────────────────────
    ws.addRow([]);

    // ── Status Legend ─────────────────────────────────────────────────────────
    const legHdrRow = ws.addRow([]);
    sectionHdr(legHdrRow, "STATUS LEGEND", 4);

    Object.entries(STATUS_STYLES).forEach(([label, style], idx) => {
      const lr = ws.addRow([]); lr.height = 17;
      const isEven = idx % 2 === 0;
      const bg = isEven ? SUMMARY_BG : WHITE;

      const lc = lr.getCell(1);
      lc.value     = label;
      lc.font      = { name: "Calibri", bold: true, size: 10, color: { argb: "FF" + style.fg } };
      lc.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + style.bg } };
      lc.alignment = { horizontal: "left", vertical: "middle" };
      lc.border    = thinBorder();
      ws.mergeCells(lr.number, 1, lr.number, 4);
    });

    // ── Spacer ────────────────────────────────────────────────────────────────
    ws.addRow([]);

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerRow = ws.addRow([`Report generated by ${systemName}  •  ${dateStr} at ${timeStr}`]);
    ws.mergeCells(footerRow.number, 1, footerRow.number, LAST_COL);
    const fc = footerRow.getCell(1);
    fc.font      = { name: "Calibri", italic: true, size: 9, color: { argb: "FF" + FOOTER_FG } };
    fc.alignment = { horizontal: "center", vertical: "middle" };
    footerRow.height = 16;

    ws.headerFooter.oddFooter = `&C&"Calibri,Italic"&9Report generated by ${systemName}  •  Page &P of &N`;

    // ── Save ──────────────────────────────────────────────────────────────────
    const timestamp = now.toISOString().slice(0, 10);
    const filename  = `${(systemConfig.companyName || "Company").replace(/\s+/g, "-")}-Attendance-Report-${timestamp}.xlsx`;

    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement("a");
    a.href       = url;
    a.download   = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderPagination = (totalPages) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4 border-t border-gray-100 pt-4">
        <div className="text-sm text-gray-700 text-center sm:text-left w-full sm:w-auto">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, reportType === "employee" ? filteredEmployees.length : filteredAttendance.length)} of {reportType === "employee" ? filteredEmployees.length : filteredAttendance.length} results
        </div>
        <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors font-medium"
          >
            Previous
          </button>
          <span className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors font-medium"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full font-sans pt-15 sm:pt-10">
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">Reports</h1>
      </div>

      {/* Report Type Selection */}
      <div className="mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-800">Report Type</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setReportType("employee");
                  setCurrentPage(1);
                }}
                className={`w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-lg font-medium text-sm transition-all ${
                  reportType === "employee"
                    ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-600 ring-offset-1"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Employee List
              </button>
              <button
                onClick={() => {
                  setReportType("attendance");
                  setCurrentPage(1);
                }}
                className={`w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-lg font-medium text-sm transition-all ${
                  reportType === "attendance"
                    ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-600 ring-offset-1"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Attendance Reports
              </button>
            </div>
          </div>
          {!isAdmin && reportType === "attendance" && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <span className="font-bold">⚠️</span> Attendance reports are only available for administrators.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Search */}
            <div className="relative w-full">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
              />
            </div>

            {/* Department Filter */}
            <div className="relative w-full">
              <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition-all shadow-sm bg-white"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>

            {/* Date Range (for attendance reports) */}
            {reportType === "attendance" && isAdmin && (
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full sm:flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                />
                <input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full sm:flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                />
              </div>
            )}
          </div>

          {/* Status Filter Checkboxes (for attendance reports) */}
          {reportType === "attendance" && isAdmin && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">Filter by Status:</label>
                <button
                  onClick={() => {
                    const allChecked = Object.values(statusFilters).every(v => v);
                    setStatusFilters({
                      Present: !allChecked,
                      Late: !allChecked,
                      Absent: !allChecked,
                      Overtime: !allChecked,
                      'Missed Clock-out': !allChecked
                    });
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {Object.values(statusFilters).every(v => v) ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {Object.keys(statusFilters).map(status => (
                  <label key={status} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={statusFilters[status]}
                      onChange={(e) => setStatusFilters(prev => ({ ...prev, [status]: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className={`text-sm font-medium px-2.5 py-1 rounded-md transition-colors ${
                      status === "Present" ? "bg-green-100 text-green-800 group-hover:bg-green-200" : 
                      status === "Late" ? "bg-yellow-100 text-yellow-800 group-hover:bg-yellow-200" :
                      status === "Absent" ? "bg-red-100 text-red-800 group-hover:bg-red-200" :
                      status === "Overtime" ? "bg-purple-100 text-purple-800 group-hover:bg-purple-200" :
                      "bg-orange-100 text-orange-800 group-hover:bg-orange-200"
                    }`}>
                      {status}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Buttons */}
      <div className="mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-800">Export Options</h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <div className="relative group w-full sm:w-auto">
                <button
                  onClick={reportType === "employee" ? generateEmployeePDF : generateAttendancePDF}
                  disabled={loading || (reportType === "attendance" && !isAdmin)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <FaFilePdf />
                </button>
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs font-medium text-white bg-gray-800 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg">
                  Export as PDF
                  <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                </span>
              </div>
              <div className="relative group w-full sm:w-auto">
                <button
                  onClick={reportType === "employee" ? generateEmployeeExcel : generateAttendanceExcel}
                  disabled={loading || (reportType === "attendance" && !isAdmin)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <FaFileExcel />
                </button>
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs font-medium text-white bg-gray-800 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg">
                  Export as Excel
                  <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Display */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 relative overflow-hidden">
        {/* Real-time update indicator */}
        {loading && (
          <div className="absolute top-4 right-4 z-10">
            <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
              <div className="w-2 h-2 bg-blue-800 rounded-full animate-pulse"></div>
              Updating...
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto" style={{ borderColor: '#1E3A8A' }}></div>
            <p className="mt-4 font-medium" style={{ color: '#1E3A8A' }}>Loading report data...</p>
          </div>
        ) : (
          <div className="p-4 sm:p-0"> {/* Padding on mobile for breathing room around the table */}
            {reportType === "employee" ? (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Employee ID</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Position</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {getCurrentPageData(filteredEmployees).map((employee, index) => (
                      <tr key={employee.id || index} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employee.employee_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">
                          {`${employee.firstname || ""} ${employee.lastname || ""}`.trim()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {employee.department || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {employee.position || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-md ${
                            (employee.status || "active").toLowerCase() === "active" ? "bg-green-100 text-green-800" : 
                            (employee.status || "").toLowerCase() === "inactive" ? "bg-gray-100 text-gray-800" :
                            "bg-blue-100 text-blue-800"
                          }`}>
                            {employee.status || "Active"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredEmployees.length === 0 && (
                  <div className="p-8 text-center text-gray-500 font-medium">
                    No employees found matching your criteria.
                  </div>
                )}
                <div className="p-4 sm:p-6">
                  {renderPagination(getTotalPages(filteredEmployees))}
                </div>
              </div>
            ) : (
              // Attendance Report Display
              isAdmin ? (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Employee ID</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Clock In</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Clock Out</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {getCurrentPageData(filteredAttendance).map((record, index) => (
                        <tr key={record.id || index} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {record.employee?.employee_id || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">
                            {`${record.employee?.firstname || ""} ${record.employee?.lastname || ""}`.trim()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(record.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <span className="bg-gray-50 px-2 py-1 rounded border border-gray-100 font-mono text-xs">
                              {formatTime(record.clock_in)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <span className="bg-gray-50 px-2 py-1 rounded border border-gray-100 font-mono text-xs">
                              {formatTime(record.clock_out)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-md shadow-sm ${
                              record.status === "Present" ? "bg-green-100 text-green-800" : 
                              record.status === "Late" ? "bg-yellow-100 text-yellow-800" :
                              record.status === "Absent" ? "bg-red-100 text-red-800" :
                              record.status === "Overtime" ? "bg-purple-100 text-purple-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {record.status || "N/A"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredAttendance.length === 0 && (
                    <div className="p-8 text-center text-gray-500 font-medium">
                      No attendance records found matching your criteria.
                    </div>
                  )}
                  <div className="p-4 sm:p-6">
                    {renderPagination(getTotalPages(filteredAttendance))}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500 bg-gray-50">
                  <div className="text-4xl mb-3">🔒</div>
                  <h3 className="text-lg font-bold text-gray-700">Access Denied</h3>
                  <p className="mt-1">You don't have permission to view attendance reports.</p>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}