import { useState, useEffect, useCallback } from "react";
import { FaDownload, FaFileExcel, FaFilePdf, FaSearch, FaFilter } from "react-icons/fa";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { useSystemConfig } from "../contexts/SystemConfigContext";
import { useSocket } from "../context/SocketContext";

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
      const token = localStorage.getItem("token");
      console.log("🔍 Fetching employees...");
      const response = await fetch("/api/employees", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      console.log("📡 Employee response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("📊 Employee data received:", data);
        // The backend returns employees directly as an array, not wrapped in an object
        setEmployees(Array.isArray(data) ? data : []);
        console.log("✅ Employees set:", Array.isArray(data) ? data.length : 0, "employees");
      } else {
        console.error("❌ Failed to fetch employees:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("❌ Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  }, [reportType]);

  const fetchDepartments = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      console.log("🔍 Fetching departments...");
      const response = await fetch("/api/departments", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      console.log("📡 Department response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("📊 Department data received:", data);
        setDepartments(data || []);
        console.log("✅ Departments set:", data?.length || 0, "departments");
      } else {
        console.error("❌ Failed to fetch departments:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("❌ Error fetching departments:", error);
    }
  }, []);

  const fetchAttendanceData = useCallback(async () => {
    if (reportType !== "attendance" || !isAdmin) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      
      if (dateFilter.startDate) params.append("start_date", dateFilter.startDate);
      if (dateFilter.endDate) params.append("end_date", dateFilter.endDate);
      if (departmentFilter) params.append("department", departmentFilter);
      
      console.log("🔍 Fetching attendance data with params:", params.toString());
      
      const response = await fetch(`/api/attendances?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      console.log("📡 Attendance response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("📊 Attendance data received:", data);
        // The backend returns attendance data directly as an array
        setAttendanceData(Array.isArray(data) ? data : []);
        console.log("✅ Attendance data set:", Array.isArray(data) ? data.length : 0, "records");
      } else {
        console.error("❌ Failed to fetch attendance data:", response.status, response.statusText);
      }
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
    return matchesSearch;
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

  const generateEmployeeExcel = () => {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Prepare employee data
    const employeeData = filteredEmployees.map(employee => ({
      "Employee ID": employee.employee_id || "",
      "First Name": employee.firstname || "",
      "Last Name": employee.lastname || "",
      "Full Name": `${employee.firstname || ""} ${employee.lastname || ""}`.trim(),
      "Department": employee.department || "N/A",
      "Position": employee.position || "N/A",
      "Status": employee.status || "Active",
      "Email": employee.email || "",
      "Phone": employee.phone || ""
    }));

    // Create worksheet with proper structure
    const ws = XLSX.utils.aoa_to_sheet([]);
    
    // Company Header Section (Rows 1-6)
    const companyName = systemConfig.companyName || systemConfig.systemName || 'SecureAttend';
    XLSX.utils.sheet_add_aoa(ws, [
      [companyName.toUpperCase()], // Row 1: Company name
      ["EMPLOYEE LIST REPORT"], // Row 2: Report title
      [], // Row 3: Empty
      [`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`], // Row 4: Generation info
      [`Total Employees: ${filteredEmployees.length}`], // Row 5: Total count
      departmentFilter ? [`Department Filter: ${departmentFilter}`] : ["Department Filter: All Departments"], // Row 6: Filter info
      [], // Row 7: Empty separator
    ], { origin: "A1" });

    // Add table headers (Row 8)
    const headers = ["Employee ID", "First Name", "Last Name", "Full Name", "Department", "Position", "Status", "Email", "Phone"];
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A8" });

    // Add employee data starting from Row 9
    if (employeeData.length > 0) {
      const dataRows = employeeData.map(employee => [
        employee["Employee ID"],
        employee["First Name"],
        employee["Last Name"],
        employee["Full Name"],
        employee["Department"],
        employee["Position"],
        employee["Status"],
        employee["Email"],
        employee["Phone"]
      ]);
      XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: "A9" });
    }

    // Add summary section
    const summaryStartRow = 9 + employeeData.length + 2;
    const statusCounts = employeeData.reduce((acc, emp) => {
      const status = emp.Status.toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const departmentCounts = employeeData.reduce((acc, emp) => {
      const dept = emp.Department;
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    XLSX.utils.sheet_add_aoa(ws, [
      [], // Empty row
      ["SUMMARY"], // Summary header
      [`Total Employees: ${employeeData.length}`],
      [`Active Employees: ${statusCounts.active || 0}`],
      [`Inactive Employees: ${statusCounts.inactive || 0}`],
      [], // Empty row
      ["DEPARTMENT BREAKDOWN"],
      ...Object.entries(departmentCounts).map(([dept, count]) => [`${dept}: ${count} employees`]),
      [], // Empty row
      [`Report generated by ${systemConfig.systemName || 'SecureAttend'} on ${new Date().toLocaleString()}`]
    ], { origin: `A${summaryStartRow}` });

    // Set column widths for better readability
    const columnWidths = [
      { wch: 12 }, // Employee ID
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 20 }, // Full Name
      { wch: 15 }, // Department
      { wch: 18 }, // Position
      { wch: 10 }, // Status
      { wch: 25 }, // Email
      { wch: 15 }  // Phone
    ];
    ws['!cols'] = columnWidths;

    // Apply cell styles
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // Style company header (Row 1)
    if (ws['A1']) {
      ws['A1'].s = {
        font: { bold: true, sz: 16 },
        alignment: { horizontal: "center" }
      };
    }
    
    // Style report title (Row 2)
    if (ws['A2']) {
      ws['A2'].s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: "center" }
      };
    }

    // Style table headers (Row 8)
    for (let col = 0; col < headers.length; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 7, c: col }); // Row 8 (0-indexed as 7)
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1E3A8A" } }, // Blue background
          alignment: { horizontal: "center" },
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" }
          }
        };
      }
    }

    // Style data cells with alternating row colors and borders
    for (let row = 8; row < 8 + employeeData.length; row++) { // Data rows start from row 9 (0-indexed as 8)
      for (let col = 0; col < headers.length; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (ws[cellAddress]) {
          ws[cellAddress].s = {
            fill: { fgColor: { rgb: row % 2 === 0 ? "F8F9FA" : "FFFFFF" } }, // Alternating colors
            border: {
              top: { style: "thin", color: { rgb: "E5E7EB" } },
              bottom: { style: "thin", color: { rgb: "E5E7EB" } },
              left: { style: "thin", color: { rgb: "E5E7EB" } },
              right: { style: "thin", color: { rgb: "E5E7EB" } }
            },
            alignment: { horizontal: [1, 2, 3, 7].includes(col) ? "left" : "center" } // Left align names and email
          };
          
          // Special formatting for status column
          if (col === 6 && ws[cellAddress].v) { // Status column
            const status = ws[cellAddress].v.toLowerCase();
            let statusColor = "000000"; // Default black
            if (status === "active") statusColor = "059669"; // Green
            else if (status === "inactive") statusColor = "6B7280"; // Gray
            
            ws[cellAddress].s.font = { color: { rgb: statusColor }, bold: true };
          }
        }
      }
    }

    // Style summary section
    const summaryRow = summaryStartRow + 1; // "SUMMARY" row
    const summaryCell = XLSX.utils.encode_cell({ r: summaryRow, c: 0 });
    if (ws[summaryCell]) {
      ws[summaryCell].s = {
        font: { bold: true, sz: 12 },
        fill: { fgColor: { rgb: "F3F4F6" } }
      };
    }

    // Merge cells for headers
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Company name
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, // Report title
      { s: { r: 3, c: 0 }, e: { r: 3, c: 8 } }, // Generated on
      { s: { r: 4, c: 0 }, e: { r: 4, c: 8 } }, // Total employees
      { s: { r: 5, c: 0 }, e: { r: 5, c: 8 } }  // Department filter
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Employee List");
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
    const filename = `${(systemConfig.companyName || 'Company').replace(/\s+/g, '-')}-Employee-List-${timestamp}.xlsx`;
    
    // Save the file
    XLSX.writeFile(wb, filename);
  };

  const generateAttendanceExcel = () => {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Prepare attendance data
    const attendanceData = filteredAttendance.map(record => ({
      "Employee ID": record.employee?.employee_id || "",
      "Employee Name": `${record.employee?.firstname || ""} ${record.employee?.lastname || ""}`.trim(),
      "Department": record.employee?.department || "N/A",
      "Date": new Date(record.date).toLocaleDateString(),
      "Clock In": formatTime(record.clock_in),
      "Clock Out": formatTime(record.clock_out),
      "Status": record.status || "N/A",
      "Hours Worked": record.total_hours ? parseFloat(record.total_hours).toFixed(2) : "N/A"
    }));

    // Create worksheet with proper structure
    const ws = XLSX.utils.aoa_to_sheet([]);
    
    // Company Header Section (Rows 1-6)
    const companyName = systemConfig.companyName || systemConfig.systemName || 'SecureAttend';
    XLSX.utils.sheet_add_aoa(ws, [
      [companyName.toUpperCase()], // Row 1: Company name
      ["ATTENDANCE REPORT"], // Row 2: Report title
      [], // Row 3: Empty
      [`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`], // Row 4: Generation info
      dateFilter.startDate && dateFilter.endDate ? [`Report Period: ${dateFilter.startDate} to ${dateFilter.endDate}`] : ["Report Period: All Records"], // Row 5: Period
      [`Total Records: ${filteredAttendance.length}`], // Row 6: Total count
      [], // Row 7: Empty separator
    ], { origin: "A1" });

    // Add table headers (Row 8)
    const headers = ["Employee ID", "Employee Name", "Department", "Date", "Clock In", "Clock Out", "Status", "Hours Worked"];
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A8" });

    // Add attendance data starting from Row 9
    if (attendanceData.length > 0) {
      const dataRows = attendanceData.map(record => [
        record["Employee ID"],
        record["Employee Name"],
        record["Department"],
        record["Date"],
        record["Clock In"],
        record["Clock Out"],
        record["Status"],
        record["Hours Worked"]
      ]);
      XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: "A9" });
    }

    // Calculate total hours if available
    const totalHours = filteredAttendance.reduce((sum, record) => {
      const hours = parseFloat(record.total_hours) || 0;
      return sum + hours;
    }, 0);

    // Add summary section
    const summaryStartRow = 9 + attendanceData.length + 2;
    XLSX.utils.sheet_add_aoa(ws, [
      [], // Empty row
      ["SUMMARY"], // Summary header
      [`Total Attendance Records: ${filteredAttendance.length}`],
      [`Total Hours Worked: ${totalHours.toFixed(2)} hours`],
      [`Average Hours per Record: ${attendanceData.length > 0 ? (totalHours / attendanceData.length).toFixed(2) : '0.00'} hours`],
      [], // Empty row
      [`Report generated by ${systemConfig.systemName || 'SecureAttend'} on ${new Date().toLocaleString()}`]
    ], { origin: `A${summaryStartRow}` });

    // Set column widths for better readability
    const columnWidths = [
      { wch: 12 }, // Employee ID
      { wch: 20 }, // Employee Name
      { wch: 15 }, // Department
      { wch: 12 }, // Date
      { wch: 10 }, // Clock In
      { wch: 10 }, // Clock Out
      { wch: 12 }, // Status
      { wch: 12 }  // Hours Worked
    ];
    ws['!cols'] = columnWidths;

    // Apply cell styles (basic formatting)
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // Style company header (Row 1)
    if (ws['A1']) {
      ws['A1'].s = {
        font: { bold: true, sz: 16 },
        alignment: { horizontal: "center" }
      };
    }
    
    // Style report title (Row 2)
    if (ws['A2']) {
      ws['A2'].s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: "center" }
      };
    }

    // Style table headers (Row 8)
    for (let col = 0; col < headers.length; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 7, c: col }); // Row 8 (0-indexed as 7)
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1E3A8A" } }, // Blue background
          alignment: { horizontal: "center" },
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" }
          }
        };
      }
    }

    // Style data cells with alternating row colors and borders
    for (let row = 8; row < 8 + attendanceData.length; row++) { // Data rows start from row 9 (0-indexed as 8)
      for (let col = 0; col < headers.length; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (ws[cellAddress]) {
          ws[cellAddress].s = {
            fill: { fgColor: { rgb: row % 2 === 0 ? "F8F9FA" : "FFFFFF" } }, // Alternating colors
            border: {
              top: { style: "thin", color: { rgb: "E5E7EB" } },
              bottom: { style: "thin", color: { rgb: "E5E7EB" } },
              left: { style: "thin", color: { rgb: "E5E7EB" } },
              right: { style: "thin", color: { rgb: "E5E7EB" } }
            },
            alignment: { horizontal: col === 1 ? "left" : "center" } // Left align names, center others
          };
          
          // Special formatting for status column
          if (col === 6 && ws[cellAddress].v) { // Status column
            const status = ws[cellAddress].v;
            let statusColor = "000000"; // Default black
            if (status === "Present") statusColor = "059669"; // Green
            else if (status === "Late") statusColor = "D97706"; // Orange
            else if (status === "Absent") statusColor = "DC2626"; // Red
            else if (status === "Overtime") statusColor = "7C3AED"; // Purple
            
            ws[cellAddress].s.font = { color: { rgb: statusColor }, bold: true };
          }
        }
      }
    }

    // Style summary section
    const summaryRow = summaryStartRow + 1; // "SUMMARY" row
    const summaryCell = XLSX.utils.encode_cell({ r: summaryRow, c: 0 });
    if (ws[summaryCell]) {
      ws[summaryCell].s = {
        font: { bold: true, sz: 12 },
        fill: { fgColor: { rgb: "F3F4F6" } }
      };
    }

    // Merge cells for headers
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Company name
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, // Report title
      { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } }, // Generated on
      { s: { r: 4, c: 0 }, e: { r: 4, c: 7 } }, // Report period
      { s: { r: 5, c: 0 }, e: { r: 5, c: 7 } }  // Total records
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
    const filename = `${(systemConfig.companyName || 'Company').replace(/\s+/g, '-')}-Attendance-Report-${timestamp}.xlsx`;
    
    // Save the file
    XLSX.writeFile(wb, filename);
  };

  const renderPagination = (totalPages) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-700">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, reportType === "employee" ? filteredEmployees.length : filteredAttendance.length)} of {reportType === "employee" ? filteredEmployees.length : filteredAttendance.length} results
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="pr-10 bg-gray-50">
      <div className="border-b-2 border-gray-200 pb-2 mb-6 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">Reports</h1>
      </div>

      {/* Report Type Selection */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Report Type</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setReportType("employee");
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  reportType === "employee"
                    ? "bg-blue-600 text-white shadow-sm"
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
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  reportType === "attendance"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Attendance Reports
              </button>
            </div>
          </div>
          {!isAdmin && reportType === "attendance" && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Attendance reports are only available for administrators.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Department Filter */}
            <div className="relative">
              <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>

            {/* Date Range (for attendance reports) */}
            {reportType === "attendance" && isAdmin && (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Export Options</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={reportType === "employee" ? generateEmployeePDF : generateAttendancePDF}
                disabled={loading || (reportType === "attendance" && !isAdmin)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaFilePdf />
                Generate PDF Report
              </button>
              <button
                onClick={reportType === "employee" ? generateEmployeeExcel : generateAttendanceExcel}
                disabled={loading || (reportType === "attendance" && !isAdmin)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaFileExcel />
                Export to Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Display */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 relative">
        {/* Real-time update indicator */}
        {loading && (
          <div className="absolute top-4 right-4 z-10">
            <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              Updating...
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            {reportType === "employee" ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getCurrentPageData(filteredEmployees).map((employee, index) => (
                      <tr key={employee.id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.employee_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {`${employee.firstname || ""} ${employee.lastname || ""}`.trim()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.department || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.position || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
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
                  <div className="p-8 text-center text-gray-500">
                    No employees found matching your criteria.
                  </div>
                )}
                {renderPagination(getTotalPages(filteredEmployees))}
              </div>
            ) : (
              // Attendance Report Display
              isAdmin ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getCurrentPageData(filteredAttendance).map((record, index) => (
                        <tr key={record.id || index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.employee?.employee_id || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {`${record.employee?.firstname || ""} ${record.employee?.lastname || ""}`.trim()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(record.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(record.clock_in)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(record.clock_out)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
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
                    <div className="p-8 text-center text-gray-500">
                      No attendance records found matching your criteria.
                    </div>
                  )}
                  {renderPagination(getTotalPages(filteredAttendance))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  You don't have permission to view attendance reports.
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}