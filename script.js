// 用于演示indexpage的演示数据

const demoCredentials = {
    username: 'admin',
    password: '123456'
};



// script.js - 统一的JavaScript文件，支持多个页面

// 页面加载时根据当前页面执行不同的初始化逻辑
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，开始初始化');
    
    // 根据当前页面路径确定要执行的逻辑
    const currentPage = window.location.pathname.split('/').pop();
    console.log('当前页面:', currentPage);
    

    if (currentPage === 'index.html' || currentPage === '') {
        initLoginPage();
    } else if (currentPage === 'dashboard.html') {
        initDashboardPage();
    } else if (currentPage === 'studentmain.html') {
        initStudentMainPage();
    } else if (currentPage === 'studentdetail.html') {
        initStudentDetailPage();
    } else if (currentPage === 'studentallcourse.html') {
       initStudentAllCoursePage();
    } else if (currentPage === 'studentfile.html') {
        // 添加这一行来初始化学生文件页面
        initStudentFilePage();
    }else if (currentPage === 'filesmain.html') {
        // 新增：初始化文件概览页面
        initFilesMainPage();
    }else if (currentPage === 'filegenerate.html') {
        // 新增：初始化文件概览页面
        initFileGeneratePage();
    } else if (currentPage === 'classmain.html') {
        initClassMainPage();
    } else if (currentPage === 'classdetail.html') {
        initClassDetailPage();
    } else if (currentPage === 'classenrolled.html') {
        initClassEnrolledPage();
    }
})

// ========================================
// 共用的辅助函数
// ========================================

// 获取状态显示文本
function getStatusDisplayText(status) {
    const statusMap = {
        'IN_PROGRESS': '在读',
        'GRADUATED': '已毕业',
        'WITHDRAWN': '已退学'
    };
    return statusMap[status] || status || '未设置';
}

// 格式化显示日期
function formatDisplayDate(dateStr) {
    if (!dateStr) return '未设置';
    
    // 如果日期已经是 YYYY-MM-DD 格式，直接返回
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
    }
    
    // 处理其他格式的日期
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        return '日期格式错误';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// 格式化学分显示
function formatCredit(credit) {
    if (!credit) return '0.0';
    
    const creditNum = parseFloat(credit);
    if (isNaN(creditNum)) return '0.0';
    
    return creditNum.toFixed(1);
}

// 格式化必修课显示
function formatCompulsory(isCompulsory) {
    if (isCompulsory === 1 || isCompulsory === '1' || isCompulsory === true) {
        return 'Yes';
    } else if (isCompulsory === 0 || isCompulsory === '0' || isCompulsory === false) {
        return 'No';
    }
    return 'N/A';
}

// 重置过滤器和排序（供全局使用）
function resetFilters() {
    const searchInput = document.getElementById('student-search');
    if (searchInput) {
        searchInput.value = '';
    }
    window.currentSortColumn = null;
    window.sortDirection = 'asc';
    window.filteredStudents = [...window.allStudents];
    displayStudents(window.allStudents);
    
    // 重置排序指示器
    const icons = document.querySelectorAll('.student-table th i');
    icons.forEach(icon => {
        icon.className = 'fa fa-sort';
        icon.style.opacity = '0.5';
        icon.style.color = '';
    });
    
    console.log('已重置所有过滤器和排序');
}

// ========================================
// 共用的辅助函数结束
// ========================================

// ========================================
// index.html (登录页面) 相关功能
// ========================================
function initLoginPage() {
    console.log('初始化登录页面');
    
    const loginForm = document.getElementById('login-form');
    const signupBtn = document.getElementById('signup-btn');
    const signupModal = document.getElementById('signup-modal');
    const closeSignupModalBtn = document.getElementById('close-signup-modal');
    const signupForm = document.getElementById('signup-form');
    
    // 登录表单提交事件
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
    }
    
    // 注册按钮事件
    if (signupBtn) {
        signupBtn.addEventListener('click', function() {
            signupModal.classList.remove('hidden');
        });
    }
    
    // 关闭注册弹窗事件
    if (closeSignupModalBtn) {
        closeSignupModalBtn.addEventListener('click', function() {
            signupModal.classList.add('hidden');
            clearSignupForm();
        });
    }
    
    // 注册表单提交事件
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleSignup();
        });
    }
    
    // 点击弹窗外部关闭
    if (signupModal) {
        signupModal.addEventListener('click', function(e) {
            if (e.target === signupModal) {
                signupModal.classList.add('hidden');
                clearSignupForm();
            }
        });
    }
}

// 处理登录逻辑
async function handleLogin() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMsg = document.getElementById('error-msg');
    const rememberCheckbox = document.getElementById('remember');
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    // 清除之前的错误信息
    errorMsg.textContent = '';
    errorMsg.style.display = 'none';
    
    // 验证输入
    if (!username || !password) {
        showLoginError('请输入用户名和密码');
        return;
    }
    
    try {
        // 发送登录请求到服务器
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            console.log('登录成功');
            
            // 如果勾选了记住我，存储用户名
            if (rememberCheckbox && rememberCheckbox.checked) {
                localStorage.setItem('rememberedUsername', username);
            }
            
            // 存储当前登录用户和角色信息
            sessionStorage.setItem('currentUser', username);
            sessionStorage.setItem('userRole', result.user.role);
            sessionStorage.setItem('userId', result.user.user_id);
            
            // 跳转到dashboard
            window.location.href = 'dashboard.html';
        } else {
            showLoginError(result.message || '登录失败');
        }
    } catch (error) {
        console.error('登录请求失败:', error);
        showLoginError('网络错误，请稍后重试');
    }
}

// 处理注册逻辑
async function handleSignup() {
    const usernameInput = document.getElementById('signup-username');
    const passwordInput = document.getElementById('signup-password');
    const confirmPasswordInput = document.getElementById('signup-confirm-password');
    const roleSelect = document.getElementById('signup-role');
    const errorMsg = document.getElementById('signup-error-msg');
    const successMsg = document.getElementById('signup-success-msg');
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();
    const role = roleSelect.value;
    
    // 清除之前的消息
    errorMsg.textContent = '';
    errorMsg.style.display = 'none';
    successMsg.textContent = '';
    successMsg.style.display = 'none';
    
    // 验证输入
    if (!username || !password || !confirmPassword || !role) {
        showSignupError('请填写所有字段');
        return;
    }
    
    if (password !== confirmPassword) {
        showSignupError('密码确认不匹配');
        return;
    }
    
    if (password.length < 6) {
        showSignupError('密码长度至少6位');
        return;
    }
    
    try {
        // 发送注册请求到服务器
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password,
                role: role
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showSignupSuccess('注册成功！请使用新账号登录。');
            // 2秒后关闭弹窗
            setTimeout(() => {
                document.getElementById('signup-modal').classList.add('hidden');
                clearSignupForm();
            }, 2000);
        } else {
            showSignupError(result.message || '注册失败');
        }
    } catch (error) {
        console.error('注册请求失败:', error);
        showSignupError('网络错误，请稍后重试');
    }
}

// 显示登录错误信息
function showLoginError(message) {
    const errorMsg = document.getElementById('error-msg');
    if (errorMsg) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
        
        setTimeout(() => {
            errorMsg.textContent = '';
            errorMsg.style.display = 'none';
        }, 5000);
    }
}

// 显示注册错误信息
function showSignupError(message) {
    const errorMsg = document.getElementById('signup-error-msg');
    if (errorMsg) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
    }
}

// 显示注册成功信息
function showSignupSuccess(message) {
    const successMsg = document.getElementById('signup-success-msg');
    if (successMsg) {
        successMsg.textContent = message;
        successMsg.style.display = 'block';
    }
}

// 清空注册表单
function clearSignupForm() {
    document.getElementById('signup-username').value = '';
    document.getElementById('signup-password').value = '';
    document.getElementById('signup-confirm-password').value = '';
    document.getElementById('signup-role').value = '';
    
    const errorMsg = document.getElementById('signup-error-msg');
    const successMsg = document.getElementById('signup-success-msg');
    
    if (errorMsg) {
        errorMsg.textContent = '';
        errorMsg.style.display = 'none';
    }
    
    if (successMsg) {
        successMsg.textContent = '';
        successMsg.style.display = 'none';
    }
}

function initDashboardPage() {
    console.log('初始化Dashboard页面');
    
    // 显示当前用户名
    const currentUser = sessionStorage.getItem('currentUser');
    const usernameSpan = document.getElementById('username');
    if (usernameSpan && currentUser) {
        usernameSpan.textContent = currentUser;
    }
}
// ========================================
// index.html (登录页面) 
// ========================================

// ========================================
// classenrolled.html 相关功能
// ========================================

function initClassEnrolledPage() {
    console.log('初始化课程注册学生页面');
    
    const urlParams = new URLSearchParams(window.location.search);
    const courseCode = urlParams.get('course_code');
    
    if (!courseCode) {
        alert('未找到课程代码参数');
        window.history.back();
        return;
    }
    
    // 存储当前课程代码供其他函数使用
    window.currentCourseCode = courseCode;
    
    // 更新页面标题
    const titleElement = document.getElementById('class-name-title');
    if (titleElement) {
        titleElement.textContent = `${courseCode} - Enrolled Students`;
    }
    
    // 加载注册学生数据
    loadEnrolledStudents(courseCode);

    // 初始化排序功能
    initEnrolledStudentsSort();
}


// 加载注册学生数据
async function loadEnrolledStudents(courseCode) {
    console.log('开始加载注册学生数据:', courseCode);
    
    try {
        const response = await fetch(`/courses/${encodeURIComponent(courseCode)}/enrolled-students`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('未找到该课程或课程无注册学生');
            } else {
                throw new Error(`服务器错误: ${response.status}`);
            }
        }
        
        const enrolledStudents = await response.json();
        console.log('成功获取注册学生数据:', enrolledStudents);
        
        // 显示注册学生列表
        displayEnrolledStudents(enrolledStudents);
        
    } catch (error) {
        console.error('加载注册学生数据失败:', error);
        showEnrolledStudentsError(error.message);
    }
}

// 显示注册学生列表
// 修改 displayEnrolledStudents 函数，添加Edit列
function displayEnrolledStudents(students) {
    window.enrolledStudentsData = students;
    console.log('显示注册学生列表');
    
    const tableBody = document.getElementById('enrolled-table-body');
    if (!tableBody) {
        console.error('未找到表格体元素');
        return;
    }
    
    tableBody.innerHTML = '';
    
    if (students.length === 0) {
        const noDataRow = document.createElement('tr');
        noDataRow.innerHTML = `
            <td colspan="10" class="no-data-message">
                <i class="fa fa-info-circle"></i>
                该课程暂无注册学生
            </td>
        `;
        tableBody.appendChild(noDataRow);
        return;
    }
    
    students.forEach(student => {
        const row = document.createElement('tr');
        row.setAttribute('data-student-id', student.student_id);
        row.innerHTML = `
            <td class="student-name">${student.full_name}</td>
            <td class="course-status">${formatCourseStatus(student.status)}</td>
            <td class="enrollment-date">${formatEnrollmentDate(student.start_year, student.start_month, student.start_day)}</td>
            <td class="finish-date">${formatDisplayDate(student.completion_date)}</td>
            <td class="midterm-grade">${student.midterm_grade || ''}</td>
            <td class="final-grade">${student.final_grade || ''}</td>
            <td class="midterm-rc">
                <button class="btn-small btn-rc" onclick="getMidtermRC('${student.student_id}')">
                    <i class="fa fa-download"></i> Get RC
                </button>
            </td>
            <td class="final-rc">
                <button class="btn-small btn-rc" onclick="getFinalRC('${student.student_id}')">
                    <i class="fa fa-download"></i> Get RC
                </button>
            </td>
            <td class="edit-action">
                <button class="btn-small btn-edit" onclick="toggleRowEdit('${student.student_id}')">
                    <i class="fa fa-pen"></i> Edit
                </button>
            </td>
            <td class="action">
                <button class="btn-small btn-delete" onclick="deleteEnrolledStudent('${student.student_id}')">
                    <i class="fa fa-trash"></i> Delete
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    console.log(`成功显示 ${students.length} 名注册学生`);
}



// 格式化课程状态
function formatCourseStatus(status) {
    const statusMap = {
        'IN_PROGRESS': 'Course In Progress',
        'COMPLETED': 'Course Completed',
        'WITHDRAWN': 'Course Withdrawn'
    };
    return statusMap[status] || status || '';
}

// 格式化注册日期
function formatEnrollmentDate(year, month, day) {
    if (!year) return '';
    
    // 月份转换函数
    const monthMap = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
        'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
        'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };
    
    const formattedMonth = monthMap[month] || '01';
    const formattedDay = day ? day.toString().padStart(2, '0') : '01';
    
    return `${year}-${formattedMonth}-${formattedDay}`;
}

// 格式化完成日期
function formatFinishDate(completionDay) {
    if (!completionDay) return 'N/A';
    return formatDisplayDate(completionDay);
}

// 查看文件（占位函数）
function viewFile(filePath) {
    console.log('查看文件:', filePath);
    // 这里之后可以实现文件查看逻辑
    alert('文件查看功能待实现');
}

// 查看学生详情
function viewStudentDetail(studentId) {
    console.log('查看学生详情:', studentId);
    window.location.href = `studentdetail.html?student_id=${encodeURIComponent(studentId)}`;
}

// 获取期中成绩单（占位函数）
function getMidtermRC(studentId) {
    console.log('获取期中成绩单:', studentId);
    // 目前不需要实现任何逻辑
}

// 获取期末成绩单（占位函数）
function getFinalRC(studentId) {
    console.log('获取期末成绩单:', studentId);
    // 目前不需要实现任何逻辑
}



// 显示错误信息
function showEnrolledStudentsError(errorMessage) {
    console.error('显示注册学生错误:', errorMessage);
    
    const tableBody = document.getElementById('enrolled-table-body');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="error-message">
                    <i class="fa fa-exclamation-triangle"></i>
                    加载失败: ${errorMessage}
                    <br>
                    <button class="btn-small" onclick="loadEnrolledStudents('${window.currentCourseCode}')">
                        <i class="fa fa-refresh"></i> 重试
                    </button>
                </td>
            </tr>
        `;
    }
}

// 初始化课程注册学生排序功能
function initEnrolledStudentsSort() {
    // 为可排序的表头添加点击事件
    const sortableHeaders = [
        { id: 'name-header', column: 'name' },
        { id: 'status-header', column: 'status' },
        { id: 'enrollment-header', column: 'enrollment_date' },
        { id: 'finish-header', column: 'finish_date' },
        { id: 'midterm-header', column: 'midterm_grade' },
        { id: 'final-header', column: 'final_grade' }
    ];
    
    sortableHeaders.forEach(header => {
        const element = document.getElementById(header.id);
        if (element) {
            element.style.cursor = 'pointer';
            element.addEventListener('click', () => sortEnrolledStudents(header.column));
        }
    });
}

// 排序课程注册学生
function sortEnrolledStudents(column) {
    if (!window.enrolledStudentsData) {
        console.log('没有学生数据可排序');
        return;
    }
    
    // 确定排序方向
    if (window.enrolledSortColumn === column) {
        window.enrolledSortDirection = window.enrolledSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        window.enrolledSortColumn = column;
        window.enrolledSortDirection = 'asc';
    }
    
    // 排序数据
    const sortedData = [...window.enrolledStudentsData].sort((a, b) => {
        let aValue, bValue;
        
        switch (column) {
            case 'name':
                aValue = a.full_name;
                bValue = b.full_name;
                break;
            case 'status':
                aValue = formatCourseStatus(a.status);
                bValue = formatCourseStatus(b.status);
                break;
            case 'enrollment_date':
                aValue = formatEnrollmentDate(a.start_year, a.start_month, a.start_day);
                bValue = formatEnrollmentDate(b.start_year, b.start_month, b.start_day);
                break;
            case 'finish_date':
                aValue = a.completion_date || '';
                bValue = b.completion_date || '';
                // 空值排在最后
                if (!aValue && !bValue) return 0;
                if (!aValue) return 1;
                if (!bValue) return -1;
                break;
            case 'midterm_grade':
                aValue = a.midterm_grade || '';
                bValue = b.midterm_grade || '';
                // 空值排在最后
                if (!aValue && !bValue) return 0;
                if (!aValue) return 1;
                if (!bValue) return -1;
                // 数字比较
                if (!isNaN(aValue) && !isNaN(bValue)) {
                    aValue = parseFloat(aValue);
                    bValue = parseFloat(bValue);
                }
                break;
            case 'final_grade':
                aValue = a.final_grade || '';
                bValue = b.final_grade || '';
                // 空值排在最后
                if (!aValue && !bValue) return 0;
                if (!aValue) return 1;
                if (!bValue) return -1;
                // 数字比较
                if (!isNaN(aValue) && !isNaN(bValue)) {
                    aValue = parseFloat(aValue);
                    bValue = parseFloat(bValue);
                }
                break;
            default:
                return 0;
        }
        
        // 执行比较
        let comparison = 0;
        if (aValue < bValue) {
            comparison = -1;
        } else if (aValue > bValue) {
            comparison = 1;
        }
        
        return window.enrolledSortDirection === 'desc' ? -comparison : comparison;
    });
    
    // 更新排序图标
    updateEnrolledSortIcons(column, window.enrolledSortDirection);
    
    // 重新显示排序后的数据
    displayEnrolledStudents(sortedData);
    
    console.log(`按 ${column} ${window.enrolledSortDirection === 'asc' ? '升序' : '降序'} 排序完成`);
}

// 更新排序图标
function updateEnrolledSortIcons(activeColumn, direction) {
    // 重置所有图标
    const allIcons = document.querySelectorAll('.student-table th i');
    allIcons.forEach(icon => {
        icon.className = 'fa fa-sort';
        icon.style.opacity = '0.5';
    });
    
    // 设置当前排序列的图标
    const columnIconMap = {
        'name': 'name-header',
        'status': 'status-header',
        'enrollment_date': 'enrollment-header',
        'finish_date': 'finish-header',
        'midterm_grade': 'midterm-header',
        'final_grade': 'final-header'
    };
    
    const activeHeader = document.getElementById(columnIconMap[activeColumn]);
    if (activeHeader) {
        const icon = activeHeader.querySelector('i');
        if (icon) {
            icon.className = direction === 'asc' ? 'fa fa-sort-up' : 'fa fa-sort-down';
            icon.style.opacity = '1';
        }
    }
}

// ========================================
// Edit Mode 功能 - 完整修复版本
// ========================================

function toggleRowEdit(studentId) {
    console.log('切换编辑模式，学生ID:', studentId, '类型:', typeof studentId);
    
    const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
    if (!row) {
        console.error('未找到学生行:', studentId);
        return;
    }
    
    const editBtn = row.querySelector('.btn-edit') || row.querySelector('.btn-save');
    
    if (!editBtn) {
        console.error('未找到编辑按钮:', studentId);
        return;
    }
    
    console.log('找到按钮，当前className:', editBtn.className);
    
    if (editBtn.classList.contains('btn-edit')) {
        console.log('进入编辑模式');
        enterRowEditMode(studentId);
    } else if (editBtn.classList.contains('btn-save')) {
        console.log('保存更改');
        saveRowChanges(studentId);
    }
}

function enterRowEditMode(studentId) {
    console.log('开始进入编辑模式，学生ID:', studentId);
    
    const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
    
    // 关键修复：类型转换
    const numericStudentId = parseInt(studentId);
    const student = window.enrolledStudentsData ? 
        window.enrolledStudentsData.find(s => s.student_id === numericStudentId) : null;
    
    console.log('查找学生结果:', {
        原始ID: studentId,
        数字ID: numericStudentId,
        找到行: !!row,
        找到学生: !!student,
        学生姓名: student ? student.full_name : '未找到'
    });
    
    if (!student || !row) {
        console.error('未找到学生数据或行元素');
        return;
    }
    
    console.log('成功进入编辑模式，学生:', student.full_name);
    
    // 存储原始数据
    row.setAttribute('data-original', JSON.stringify({
        status: student.status,
        enrollment_date: formatEnrollmentDate(student.start_year, student.start_month, student.start_day),
        finish_date: student.completion_date || '',
        midterm_grade: student.midterm_grade || '',
        final_grade: student.final_grade || ''
    }));
    
    // 转换为编辑模式
    const statusCell = row.querySelector('.course-status');
    const currentStatus = student.status;
    statusCell.innerHTML = `
        <select class="edit-status">
            <option value="IN_PROGRESS" ${currentStatus === 'IN_PROGRESS' ? 'selected' : ''}>Course In Progress</option>
            <option value="COMPLETED" ${currentStatus === 'COMPLETED' ? 'selected' : ''}>Course Completed</option>
            <option value="WITHDRAWN" ${currentStatus === 'WITHDRAWN' ? 'selected' : ''}>Course Withdrawn</option>
        </select>
    `;
    
    const enrollmentCell = row.querySelector('.enrollment-date');
    const enrollmentDate = formatEnrollmentDate(student.start_year, student.start_month, student.start_day);
    enrollmentCell.innerHTML = `
        <input type="date" class="edit-enrollment-date" value="${enrollmentDate}">
    `;
    
    const finishCell = row.querySelector('.finish-date');
    const finishDate = student.completion_date || '';
    finishCell.innerHTML = `
        <input type="date" class="edit-finish-date" value="${finishDate}">
    `;
    
    const midtermCell = row.querySelector('.midterm-grade');
    const midtermGrade = student.midterm_grade || '';
    midtermCell.innerHTML = `
        <input type="text" class="edit-midterm-grade" value="${midtermGrade}" placeholder="Enter grade">
    `;
    
    const finalCell = row.querySelector('.final-grade');
    const finalGrade = student.final_grade || '';
    finalCell.innerHTML = `
        <input type="text" class="edit-final-grade" value="${finalGrade}" placeholder="Enter grade">
    `;
    
    // 切换按钮状态
    const editBtn = row.querySelector('.btn-edit');
    if (editBtn) {
        editBtn.innerHTML = '<i class="fa fa-save"></i> Save';
        editBtn.classList.remove('btn-edit');
        editBtn.classList.add('btn-save');
        console.log('按钮已切换为保存模式');
    } else {
        console.error('未找到编辑按钮进行切换');
    }
}

async function saveRowChanges(studentId) {
    console.log('开始保存更改，学生ID:', studentId);
    
    const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
    const originalData = JSON.parse(row.getAttribute('data-original'));
    
    // 收集当前数据
    const statusSelect = row.querySelector('.edit-status');
    const enrollmentInput = row.querySelector('.edit-enrollment-date');
    const finishInput = row.querySelector('.edit-finish-date');
    const midtermInput = row.querySelector('.edit-midterm-grade');
    const finalInput = row.querySelector('.edit-final-grade');
    
    const currentData = {
        status: statusSelect.value,
        enrollment_date: enrollmentInput.value,
        finish_date: finishInput.value,
        midterm_grade: midtermInput.value,
        final_grade: finalInput.value
    };
    
    console.log('收集到的数据:', currentData);
    console.log('原始数据:', originalData);
    
    // 检查是否有更改
    const hasChanges = JSON.stringify(originalData) !== JSON.stringify(currentData);
    
    if (!hasChanges) {
        showRowMessage('没有收集到任何更新数据', 'warning');
        exitRowEditMode(studentId);
        return;
    }
    
    // 准备更新数据
    let startYear = null, startMonth = null, startDay = null;
    if (currentData.enrollment_date) {
        const dateParts = currentData.enrollment_date.split('-');
        startYear = parseInt(dateParts[0]);
        startDay = parseInt(dateParts[2]);
        
        const monthNumber = parseInt(dateParts[1]);
        const monthMap = {
            1: 'JAN', 2: 'FEB', 3: 'MAR', 4: 'APR',
            5: 'MAY', 6: 'JUN', 7: 'JUL', 8: 'AUG',
            9: 'SEP', 10: 'OCT', 11: 'NOV', 12: 'DEC'
        };
        startMonth = monthMap[monthNumber];
    }
    
    const updateData = {
        studentId: parseInt(studentId), // 确保是数字类型
        status: currentData.status,
        startYear: startYear,
        startMonth: startMonth,
        startDay: startDay,
        completionDate: currentData.finish_date || null,
        midtermGrade: currentData.midterm_grade || null,
        finalGrade: currentData.final_grade || null
    };
    
    console.log('发送到后端的数据:', updateData);
    
    try {
        const response = await fetch(`/courses/${encodeURIComponent(window.currentCourseCode)}/enrolled-students/single-update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`保存失败: ${response.status} - ${errorText}`);
        }
        
        // 更新本地数据
        const numericStudentId = parseInt(studentId);
        const studentIndex = window.enrolledStudentsData.findIndex(s => s.student_id === numericStudentId);
        if (studentIndex !== -1) {
            window.enrolledStudentsData[studentIndex] = {
                ...window.enrolledStudentsData[studentIndex],
                status: currentData.status,
                start_year: startYear,
                start_month: startMonth,
                start_day: startDay,
                completion_date: currentData.finish_date || null,
                midterm_grade: currentData.midterm_grade || null,
                final_grade: currentData.final_grade || null
            };
        }
        
        exitRowEditMode(studentId);
        showRowMessage('修改成功！', 'success');
        
    } catch (error) {
        console.error('保存失败:', error);
        showRowMessage('保存失败: ' + error.message, 'error');
    }
}

function exitRowEditMode(studentId) {
    console.log('退出编辑模式，学生ID:', studentId);
    
    const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
    const numericStudentId = parseInt(studentId);
    const student = window.enrolledStudentsData.find(s => s.student_id === numericStudentId);
    
    if (!student || !row) {
        console.error('退出编辑模式失败：未找到学生或行');
        return;
    }
    
    console.log('退出编辑模式，学生:', student.full_name);
    
    // 恢复显示模式
    row.querySelector('.course-status').textContent = formatCourseStatus(student.status);
    row.querySelector('.enrollment-date').textContent = formatEnrollmentDate(student.start_year, student.start_month, student.start_day);
    row.querySelector('.finish-date').textContent = formatDisplayDate(student.completion_date);
    row.querySelector('.midterm-grade').textContent = student.midterm_grade || '';
    row.querySelector('.final-grade').textContent = student.final_grade || '';
    
    // 恢复编辑按钮
    const saveBtn = row.querySelector('.btn-save');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fa fa-pen"></i> Edit';
        saveBtn.classList.remove('btn-save');
        saveBtn.classList.add('btn-edit');
        console.log('按钮已恢复为编辑模式');
    } else {
        console.error('未找到保存按钮进行恢复');
    }
    
    // 清除原始数据
    row.removeAttribute('data-original');
}

function showRowMessage(message, type) {
    let messageEl = document.getElementById('row-message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'row-message';
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 1000;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            color: white;
            font-weight: bold;
        `;
        document.body.appendChild(messageEl);
    }
    
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800'
    };
    
    messageEl.style.background = colors[type] || colors.success;
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        if (messageEl) {
            messageEl.style.display = 'none';
        }
    }, 3000);
}

// ==========================================
// classenrolled.html 相关功能结束
// ==========================================




// ========================================
// classdetail.html 相关功能
// ========================================
// 初始化课程详情页面
function initClassDetailPage() {
    console.log('初始化课程详情页面');
    
    // 获取URL参数中的课程代码
    const urlParams = new URLSearchParams(window.location.search);
    const courseCode = urlParams.get('course_code');
    
    console.log('课程代码:', courseCode);
    
    if (!courseCode) {
        showCourseError('未找到课程代码参数');
        return;
    }

   // 在 loadCourseDetail 函数成功获取数据后添加
    window.currentCourseCode = courseCode;
    
    // 加载课程详细信息
    loadCourseDetail(courseCode);
    
    // 初始化返回按钮
    initGoBackButton();

    // 初始化编辑模式事件监听器
    initClassDetailEditListeners();

}

// 加载课程详细信息
async function loadCourseDetail(courseCode) {
    console.log('开始加载课程详情:', courseCode);
    
    try {
        // 显示加载状态
        showLoadingState();
        
        const response = await fetch(`/courses/${encodeURIComponent(courseCode)}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('未找到该课程');
            } else {
                throw new Error(`服务器错误: ${response.status}`);
            }
        }
        
        const courseData = await response.json();
        console.log('成功获取课程详情:', courseData);
        
        // 显示课程详细信息
        displayCourseDetail(courseData);
        
    } catch (error) {
        console.error('加载课程详情失败:', error);
        showCourseError(error.message);
    }
}

// 显示加载状态
function showLoadingState() {
    const loadingElement = document.getElementById('initial-loading');
    const contentElement = document.querySelector('.course-content');
    
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
    
    if (contentElement) {
        contentElement.style.display = 'none';
    }
}

// 显示课程详细信息
function displayCourseDetail(courseData) {
    console.log('显示课程详细信息');
    
    // 隐藏加载状态，显示内容
    const loadingElement = document.getElementById('initial-loading');
    const contentElement = document.querySelector('.course-content');
    
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    if (contentElement) {
        contentElement.style.display = 'block';
    }
    
    // 更新页面标题
    const courseTitle = document.querySelector('.course-title');
    if (courseTitle) {
        courseTitle.textContent = `Course Detail - ${courseData.course_code || 'Unknown'}`;
    }
    
    // 填充课程信息
    updateCourseField('course-name', courseData.course_name || 'Unnamed Course');
    updateCourseField('course-code', courseData.course_code || 'N/A');
    updateCourseField('course-level', courseData.course_level || 'N/A');
    updateCourseField('course-credit', formatCredit(courseData.credit));
    updateCourseField('course-compulsory', formatCompulsory(courseData.is_compulsory));
    updateCourseField('course-description', courseData.description || 'No description available.');
    
    console.log('课程详细信息显示完成');

    // 在 displayCourseDetail 函数的最后添加这一行
    window.currentCourseCode = courseData.course_code;
}

// 更新课程字段显示
function updateCourseField(fieldId, value) {
    const element = document.getElementById(fieldId);
    if (element) {
        // 对于描述字段，保持原始格式
        if (fieldId === 'course-description') {
            element.textContent = value;
        } else {
            element.textContent = value;
        }
        
        // 为不同字段添加特殊样式
        if (fieldId === 'course-credit') {
            element.className = 'info-value credit-display';
        } else if (fieldId === 'course-compulsory') {
            element.className = `info-value compulsory-display ${value.toLowerCase() === 'yes' ? 'compulsory-yes' : 'compulsory-no'}`;
        } else if (fieldId === 'course-level') {
            element.className = 'info-value level-display';
        }
    } else {
        console.warn(`未找到字段元素: ${fieldId}`);
    }
}

// 显示错误信息
function showCourseError(errorMessage) {
    console.error('显示课程错误:', errorMessage);
    
    const loadingElement = document.getElementById('initial-loading');
    const contentElement = document.querySelector('.course-content');
    
    // 隐藏加载状态和内容
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    if (contentElement) {
        contentElement.style.display = 'none';
    }
    
    // 创建错误显示元素
    const errorElement = document.createElement('div');
    errorElement.className = 'error-state';
    errorElement.innerHTML = `
        <div class="error-content">
            <i class="fa fa-exclamation-triangle error-icon"></i>
            <h3>加载课程信息失败</h3>
            <p>${errorMessage}</p>
            <div class="error-actions">
                <button class="btn secondary" onclick="window.history.back()">
                    <i class="fa fa-arrow-left"></i> 返回课程列表
                </button>
                <button class="btn primary" onclick="location.reload()">
                    <i class="fa fa-refresh"></i> 重新加载
                </button>
            </div>
        </div>
    `;
    
    // 将错误元素插入到容器中
    const container = document.querySelector('.course-detail-container');
    if (container) {
        container.appendChild(errorElement);
    }
}

// 初始化返回按钮
function initGoBackButton() {
    const goBackBtn = document.getElementById('go-back-btn');
    if (goBackBtn) {
        goBackBtn.addEventListener('click', function() {
            // 返回到课程列表页面
            window.location.href = 'classmain.html';
        });
        
        // 添加悬停效果
        goBackBtn.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#e2e8f0';
        });
        
        goBackBtn.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
    }
}
// 以上是view mode

// 以下是edit mode 

// 初始化课程详情编辑模式事件监听器
function initClassDetailEditListeners() {
    const editBtn = document.getElementById('edit-class-info-btn');
    const saveBtn = document.getElementById('save-changes-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    
    if (editBtn) {
        editBtn.addEventListener('click', enterClassDetailEditMode);
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveCourseDetailChanges);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelClassDetailEditMode);
    }
}

// 进入课程详情编辑模式
function enterClassDetailEditMode() {
    console.log('进入课程详情编辑模式');
    
    // 从视图模式获取当前值并填充到编辑表单
    const courseName = document.getElementById('course-name').textContent;
    const courseCode = document.getElementById('course-code').textContent;
    const compulsory = document.getElementById('course-compulsory').textContent;
    const description = document.getElementById('course-description').textContent;
    const courseLevel = document.getElementById('course-level').textContent;
    const courseCredit = document.getElementById('course-credit').textContent;
    
    // 填充编辑表单
    document.getElementById('edit-course-name').value = courseName;
    document.getElementById('edit-course-code').value = courseCode;
    document.getElementById('edit-course-compulsory').value = compulsory;
    document.getElementById('edit-course-description').value = description;
    
    // 为 Level 提取数字部分 (如果是 "Grade 10" 格式)
    const levelNumber = courseLevel.replace(/\D/g, '') || courseLevel;
    document.getElementById('edit-course-level').value = levelNumber;
    document.getElementById('edit-course-credit').value = courseCredit;
    
    // 禁用 Level 和 Credit 字段
    document.getElementById('edit-course-level').disabled = true;
    document.getElementById('edit-course-credit').disabled = true;
    
    // 切换显示状态
    document.getElementById('course-view-mode').style.display = 'none';
    document.getElementById('course-edit-mode').style.display = 'block';
    document.getElementById('view-mode-controls').style.display = 'none';
    document.getElementById('edit-controls-edit').style.display = 'block';
    
    // 移除之前的事件监听器，避免重复绑定
    const levelElement = document.getElementById('edit-course-level');
    const creditElement = document.getElementById('edit-course-credit');
    
    levelElement.removeEventListener('click', showLevelAlert);
    creditElement.removeEventListener('click', showCreditAlert);
    
    // 添加新的事件监听器
    levelElement.addEventListener('click', showLevelAlert);
    creditElement.addEventListener('click', showCreditAlert);
    
    console.log('已进入课程详情编辑模式');
}

// 独立的警告函数，避免重复定义
function showLevelAlert() {
    alert('Course Level Cannot be Modified');
}

function showCreditAlert() {
    alert('Course Credit Cannot be Modified');
}

// 取消课程详情编辑模式
function cancelClassDetailEditMode() {
    console.log('取消课程详情编辑模式');
    
    // 切换回视图模式
    document.getElementById('course-view-mode').style.display = 'block';
    document.getElementById('course-edit-mode').style.display = 'none';
    document.getElementById('view-mode-controls').style.display = 'flex';
    document.getElementById('edit-controls-edit').style.display = 'none';
    
    console.log('已返回课程详情视图模式');
}

// 保存课程详情更改
async function saveCourseDetailChanges() {
    console.log('开始保存课程详情更改');
    
    try {
        // 获取当前课程代码（用于标识要更新的记录）
        const originalCourseCode = document.getElementById('course-code').textContent;
        
        // 获取编辑表单的值
        const updatedData = {
            course_name: document.getElementById('edit-course-name').value.trim(),
            course_code: document.getElementById('edit-course-code').value.trim(),
            is_compulsory: document.getElementById('edit-course-compulsory').value === 'Yes' ? 1 : 0,
            description: document.getElementById('edit-course-description').value.trim()
        };
        
        // 验证必填字段
        if (!updatedData.course_name) {
            alert('课程名称不能为空');
            return;
        }
        
        if (!updatedData.course_code) {
            alert('课程代码不能为空');
            return;
        }
        
        // 禁用保存按钮，防止重复提交
        const saveBtn = document.getElementById('save-changes-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> 保存中...';
        
        // 发送更新请求
        const response = await fetch(`/courses/${encodeURIComponent(originalCourseCode)}/update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '更新失败');
        }
        
        const result = await response.json();
        console.log('课程更新成功:', result);
        
        // 更新视图模式中的显示值
        document.getElementById('course-name').textContent = updatedData.course_name;
        document.getElementById('course-code').textContent = updatedData.course_code;
        document.getElementById('course-compulsory').textContent = updatedData.is_compulsory === 1 ? 'Yes' : 'No';
        document.getElementById('course-description').textContent = updatedData.description;
        
        // 如果课程代码改变了，更新URL
        if (updatedData.course_code !== originalCourseCode) {
            const newUrl = `classdetail.html?course_code=${encodeURIComponent(updatedData.course_code)}`;
            window.history.replaceState({}, '', newUrl);
        }
        
        // 返回视图模式
        // 返回视图模式
        cancelClassDetailEditMode();  
        
        // 显示成功消息
        alert('课程信息更新成功！');
        
    } catch (error) {
        console.error('保存课程详情失败:', error);
        alert(`保存失败: ${error.message}`);
    } finally {
        // 恢复保存按钮
        const saveBtn = document.getElementById('save-changes-btn');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa fa-save"></i> Save Changes';
    }
}

// 跳转到已注册学生页面
function showEnrolledStudents() {
    if (window.currentCourseCode) {
        window.location.href = `classenrolled.html?course_code=${encodeURIComponent(window.currentCourseCode)}`;
    } else {
        alert('无法获取课程信息，请刷新页面重试');
    }
}
// ======================================
// classdetail.html 相关功能结束
// ======================================


// ========================================
// classmain.html 相关功能
// ========================================

// 初始化课程主页面
function initClassMainPage() {
    console.log('初始化课程主页面');
    loadCoursesData();
    initCourseSearch();
    initCourseTableSort();
}

// 加载课程数据
async function loadCoursesData() {
    console.log('开始加载课程数据');
    
    const coursesBody = document.getElementById('courses-body');
    
    try {
        // 显示加载状态
        if (coursesBody) {
            coursesBody.innerHTML = '<tr><td colspan="4" class="loading-cell"><i class="fa fa-spinner fa-spin"></i> 加载课程数据中...</td></tr>';
        }
        
        const response = await fetch('/courses');
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        
        const courses = await response.json();
        console.log('成功获取课程数据:', courses);
        
        // 保存到全局变量供搜索使用
        window.allCourses = courses;
        window.filteredCourses = [...courses];
        
        // 显示课程数据
        renderCourseTable(courses);
        
    } catch (error) {
        console.error('加载课程数据失败:', error);
        
        let errorMsg = '加载课程数据失败。';
        if (error.message.includes('404')) {
            errorMsg = '课程服务不可用。请检查服务器配置。';
        } else if (error.message.includes('Failed to fetch')) {
            errorMsg = '无法连接到服务器。请检查网络连接。';
        } else {
            errorMsg = `加载课程数据失败: ${error.message}`;
        }
        
        if (coursesBody) {
            coursesBody.innerHTML = `<tr><td colspan="4" class="error-cell"><i class="fa fa-exclamation-triangle"></i> ${errorMsg}</td></tr>`;
        }
    }
}

// 渲染课程表格
function renderCourseTable(courses) {
    console.log('渲染课程表格，课程数量:', courses.length);
    
    const coursesBody = document.getElementById('courses-body');
    if (!coursesBody) {
        console.error('未找到课程表格容器');
        return;
    }
    
    // 清空现有内容
    coursesBody.innerHTML = '';
    
    if (courses.length === 0) {
        coursesBody.innerHTML = '<tr><td colspan="4" class="empty-cell"><i class="fa fa-info-circle"></i> 暂无课程数据</td></tr>';
        return;
    }
    
    courses.forEach(course => {
        const row = createCourseTableRow(course);
        coursesBody.appendChild(row);
    });
    
    console.log(`课程表格渲染完成，显示了 ${courses.length} 门课程`);
}

// 创建课程表格行
function createCourseTableRow(course) {
    const row = document.createElement('tr');
    row.className = 'course-row';
    
    row.innerHTML = `
        <td class="course-code">
            <strong>${course.course_code || 'N/A'}</strong>
        </td>
        <td class="course-name">
            ${course.course_name || 'Unnamed Course'}
        </td>
        <td class="course-credit">
            <span class="credit-badge">${formatCredit(course.credit)}</span>
        </td>
        <td class="course-level">
            <span class="level-badge">${course.course_level || 'N/A'}</span>
        </td>
    `;
    
    // 添加点击事件跳转到详情页
    row.addEventListener('click', function() {
        const courseCode = course.course_code;
        if (courseCode) {
            window.location.href = `classdetail.html?course_code=${encodeURIComponent(courseCode)}`;
        }
    });
    
    // 添加悬停效果
    row.addEventListener('mouseenter', function() {
        this.style.backgroundColor = '#f8fafc';
        this.style.cursor = 'pointer';
    });
    
    row.addEventListener('mouseleave', function() {
        this.style.backgroundColor = '';
    });
    
    return row;
}

// 初始化课程搜索
function initCourseSearch() {
    console.log('初始化课程搜索');
    
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', handleCourseSearch);
        searchInput.placeholder = 'Search for courses by code, name, or level...';
    }
}

// 处理课程搜索
function handleCourseSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    console.log('搜索课程:', searchTerm);
    
    if (!window.allCourses) {
        console.warn('课程数据未加载');
        return;
    }
    
    if (searchTerm === '') {
        // 如果搜索为空，显示所有课程
        window.filteredCourses = [...window.allCourses];
    } else {
        // 按课程代码、课程名称、课程等级搜索
        window.filteredCourses = window.allCourses.filter(course => {
            const courseCode = (course.course_code || '').toLowerCase();
            const courseName = (course.course_name || '').toLowerCase();
            const courseLevel = (course.course_level || '').toLowerCase();
            
            return courseCode.includes(searchTerm) ||
                   courseName.includes(searchTerm) ||
                   courseLevel.includes(searchTerm);
        });
    }
    
    console.log(`搜索结果: ${window.filteredCourses.length} 门课程`);
    renderCourseTable(window.filteredCourses);
}

// 初始化课程表格排序
function initCourseTableSort() {
    console.log('初始化课程表格排序');
    
    // 为可排序的表头添加点击事件
    const sortableHeaders = document.querySelectorAll('#courses-table th');
    
    sortableHeaders.forEach((header, index) => {
        // 只为前三列添加排序功能（Course Code, Course Name, Course Level）
        if (index === 0 || index === 1 || index === 3) {
            header.style.cursor = 'pointer';
            header.innerHTML += ' <i class="fa fa-sort sort-icon" style="opacity: 0.5;"></i>';
            
            header.addEventListener('click', () => {
                const column = getColumnName(index);
                sortCourseTable(column, header);
            });
        }
    });
}

// 获取列名
function getColumnName(index) {
    const columns = ['course_code', 'course_name', 'credit', 'course_level'];
    return columns[index];
}

// 排序课程表格
function sortCourseTable(column, headerElement) {
    console.log('排序课程表格:', column);
    
    if (!window.filteredCourses || window.filteredCourses.length === 0) {
        console.warn('没有可排序的课程数据');
        return;
    }
    
    // 确定排序方向
    const currentDirection = headerElement.getAttribute('data-sort-direction') || 'asc';
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    
    // 重置所有排序图标
    const allIcons = document.querySelectorAll('#courses-table .sort-icon');
    allIcons.forEach(icon => {
        icon.className = 'fa fa-sort sort-icon';
        icon.style.opacity = '0.5';
    });
    
    // 更新当前列的排序图标
    const currentIcon = headerElement.querySelector('.sort-icon');
    if (currentIcon) {
        currentIcon.className = newDirection === 'asc' ? 'fa fa-sort-up sort-icon' : 'fa fa-sort-down sort-icon';
        currentIcon.style.opacity = '1';
    }
    
    // 设置排序方向属性
    headerElement.setAttribute('data-sort-direction', newDirection);
    
    // 执行排序
    window.filteredCourses.sort((a, b) => {
        let valueA = (a[column] || '').toString().toLowerCase();
        let valueB = (b[column] || '').toString().toLowerCase();
        
        // 特殊处理课程等级的排序
        if (column === 'course_level') {
            valueA = normalizeCourseLevel(valueA);
            valueB = normalizeCourseLevel(valueB);
        }
        
        if (valueA < valueB) {
            return newDirection === 'asc' ? -1 : 1;
        }
        if (valueA > valueB) {
            return newDirection === 'asc' ? 1 : -1;
        }
        return 0;
    });
    
    // 重新渲染表格
    renderCourseTable(window.filteredCourses);
    
    console.log(`课程表格已按 ${column} ${newDirection === 'asc' ? '升序' : '降序'} 排序`);
}

// 标准化课程等级用于排序
function normalizeCourseLevel(level) {
    // 提取数字用于更好的排序
    const match = level.match(/(\d+)/);
    if (match) {
        return match[1].padStart(2, '0') + level; // 例如 "9" -> "09grade9"
    }
    return level;
}

// ========================================
// classmain.html 相关功能结束
// ========================================


// ========================================
// filesmain.html 相关功能
// ========================================

// 初始化文件概览页面
function initFilesMainPage() {
  console.log('初始化文件概览页面');
  loadTemplateFilesOverview();
}

// 加载模板文件概览
async function loadTemplateFilesOverview() {
  console.log('开始加载模板文件概览');
  
  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const filesGrid = document.getElementById('files-grid');
  const filesSummary = document.getElementById('files-summary');
  
  try {
    // 显示加载状态
    if (loadingMessage) loadingMessage.style.display = 'block';
    if (errorMessage) errorMessage.style.display = 'none';
    if (filesGrid) filesGrid.style.display = 'none';
    if (filesSummary) filesSummary.style.display = 'none';
    
    const response = await fetch('/api/templates');
    
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }
    
    const templates = await response.json();
    console.log('成功获取模板文件:', templates);
    
    // 隐藏加载状态
    if (loadingMessage) loadingMessage.style.display = 'none';
    
    if (templates.length === 0) {
      renderErrorMessageOverview('未找到任何模板文件。请确保 templates 文件夹中包含 PDF 或 DOCX 文件。');
      return;
    }
    
    // 显示文件概览
    displayTemplateFilesOverview(templates);
    
    // 显示统计信息
    displayFilesSummary(templates);
    
  } catch (error) {
    console.error('加载模板文件失败:', error);
    if (loadingMessage) loadingMessage.style.display = 'none';
    
    let errorMsg = '加载模板文件失败。';
    if (error.message.includes('404')) {
      errorMsg = '模板服务不可用。请检查服务器配置。';
    } else if (error.message.includes('Failed to fetch')) {
      errorMsg = '无法连接到服务器。请检查网络连接。';
    } else {
      errorMsg = `加载模板文件失败: ${error.message}`;
    }
    renderErrorMessageOverview(errorMsg);
  }
}

// 显示模板文件概览
function displayTemplateFilesOverview(templates) {
  console.log('显示模板文件概览');
  
  const filesGrid = document.getElementById('files-grid');
  if (!filesGrid) {
    console.error('未找到文件网格容器');
    return;
  }
  
  // 清空现有内容
  filesGrid.innerHTML = '';
  
  templates.forEach(template => {
    const fileCard = createFileCardOverview(template);
    filesGrid.appendChild(fileCard);
  });
  
  // 显示文件网格
  filesGrid.style.display = 'grid';
  
  console.log(`显示了 ${templates.length} 个模板文件`);
}

// 创建文件卡片（概览版本）- 添加点击跳转功能
function createFileCardOverview(template) {
  const card = document.createElement('div');
  card.className = 'file-card-overview';
  
  // 确定文件类型的CSS类
  const typeClass = template.type === 'pdf' ? 'pdf-file' : 'docx-file';
  card.classList.add(typeClass);
  
  // 检查是否为Report Card文件
  const isReportCard = isReportCardFileOverview(template.name);
  
  // 格式化最后修改时间
  const lastModified = new Date(template.lastModified).toLocaleDateString();
  
  card.innerHTML = `
    <div class="file-icon">
      <i class="fa ${template.icon}"></i>
    </div>
    <div class="file-info">
      <h3 class="file-name">${template.displayName}</h3>
      <p class="file-details">
        <span class="file-type">${template.type.toUpperCase()}</span>
        <span class="file-size">${template.size}</span>
      </p>
      <p class="file-description">
        ${template.type.toUpperCase()} template file for generating student documents.
        ${isReportCard ? '<br><strong style="color: #f59e0b;">⚠️ Click to view usage instructions</strong>' : '<br><strong style="color: #10b981;">✨ Click to generate documents</strong>'}
      </p>
      <p class="file-modified">
        <i class="fa fa-clock"></i> Last modified: ${lastModified}
      </p>
    </div>
    <div class="file-status">
      <span class="status-badge available">
        <i class="fa fa-check-circle"></i> Available
      </span>
    </div>
  `;
  
  // 添加悬停效果
  card.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-2px)';
    this.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
    this.style.cursor = 'pointer';
  });
  
  card.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0)';
    this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  });
  
  // 添加点击事件
  card.addEventListener('click', function() {
    if (isReportCard) {
      showReportCardAlert();
    } else {
      // 跳转到 filegenerate.html，传递文件名参数
      const filename = encodeURIComponent(template.name);
      window.location.href = `filegenerate.html?file=${filename}`;
      console.log(`点击文件卡片，跳转到生成页面: ${template.name}`);
    }
  });
  
  return card;
}

// 显示文件统计信息
function displayFilesSummary(templates) {
  const docxCount = templates.filter(t => t.type === 'docx').length;
  const pdfCount = templates.filter(t => t.type === 'pdf').length;
  const totalCount = templates.length;
  
  const docxCountEl = document.getElementById('docx-count');
  const pdfCountEl = document.getElementById('pdf-count');
  const totalCountEl = document.getElementById('total-count');
  const filesSummary = document.getElementById('files-summary');
  
  if (docxCountEl) docxCountEl.textContent = docxCount;
  if (pdfCountEl) pdfCountEl.textContent = pdfCount;
  if (totalCountEl) totalCountEl.textContent = totalCount;
  if (filesSummary) filesSummary.style.display = 'flex';
  
  console.log(`文件统计: DOCX=${docxCount}, PDF=${pdfCount}, 总计=${totalCount}`);
}

// 显示错误消息（概览页面专用）
function renderErrorMessageOverview(message) {
  console.error('显示错误:', message);
  
  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const filesGrid = document.getElementById('files-grid');
  const filesSummary = document.getElementById('files-summary');
  
  // 隐藏加载消息、文件网格和统计信息
  if (loadingMessage) loadingMessage.style.display = 'none';
  if (filesGrid) filesGrid.style.display = 'none';
  if (filesSummary) filesSummary.style.display = 'none';
  
  // 显示错误消息
  if (errorText) errorText.textContent = message;
  if (errorMessage) errorMessage.style.display = 'block';
}


// 检查文件是否为Report Card（概览页面专用）
function isReportCardFileOverview(filename) {
  const reportCardFiles = [
    'EVA Report Card - final 2025.pdf',
    'EVA Report Card - midterm 2025.pdf',
    'EVA Report Card - final 2025.docx',
    'EVA Report Card - midterm 2025.docx'
  ];
  return reportCardFiles.includes(filename);
}

// 显示Report Card提醒弹窗
function showReportCardAlert() {
  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.className = 'report-card-overlay';
  
  // 创建弹窗
  const modal = document.createElement('div');
  modal.className = 'report-card-modal';
  
  modal.innerHTML = `
    <div class="modal-header">
      <i class="fa fa-exclamation-triangle"></i>
      <h3>Report Card Information</h3>
    </div>
    <div class="modal-body">
      <p>Report Card generation is only available on the student file page.</p>
      <p><strong>Please issue Report Card on student file page Only</strong></p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="closeReportCardAlert()">
        <i class="fa fa-check"></i> OK
      </button>
    </div>
  `;
  
  // 添加到页面
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // 添加关闭事件
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      closeReportCardAlert();
    }
  });
  
  // 存储引用以便关闭
  window.currentReportCardAlert = overlay;
  
  console.log('显示Report Card提醒弹窗');
}

// 关闭Report Card提醒弹窗
function closeReportCardAlert() {
  if (window.currentReportCardAlert) {
    document.body.removeChild(window.currentReportCardAlert);
    window.currentReportCardAlert = null;
    console.log('关闭Report Card提醒弹窗');
  }
}

// ========================================
// filesmain.html 相关功能结束
// ========================================


// ========================================
// filegenerate.html 相关功能 - 新增
// ========================================

// 初始化文件生成页面
function initFileGeneratePage() {
  console.log('初始化文件生成页面');
  
  // 获取URL参数中的文件名
  const urlParams = new URLSearchParams(window.location.search);
  const filename = urlParams.get('file');
  
  console.log('从URL获取的文件名:', filename);
  
  if (!filename) {
    console.error('未找到文件名参数');
    showErrorState('错误：未找到文件参数。请从文件概览页面进入此页面。');
    return;
  }

  window.currentFilename = filename;
  
  // 初始化全局变量
  window.allStudents = [];
  window.filteredStudents = [];
  window.selectedStudents = new Set();
  window.currentSortColumn = null;
  window.sortDirection = 'asc';
  
  // 设置页面标题和文件信息
  setupFileInfo(filename);
  
  // 加载学生数据
  loadStudentsForGeneration();
  
  // 设置事件监听器
  setupGenerationPageEventListeners();
}

// 设置文件信息
function setupFileInfo(filename) {
  console.log('设置文件信息：', filename);
  
  // 获取文件显示名称和图标
  const fileInfo = getFileDisplayInfo(filename);
  
  // 更新页面标题
  const pageTitle = document.getElementById('page-title');
  const fileTitle = document.getElementById('file-title');
  if (pageTitle) pageTitle.textContent = `Generate ${fileInfo.displayName} - Emerald Valley Academy`;
  if (fileTitle) fileTitle.textContent = `Generate ${fileInfo.displayName}`;
  
  // 更新文件信息卡片
  const fileInfoCard = document.getElementById('file-info-card');
  const fileIconDisplay = document.getElementById('file-icon-display');
  const fileDisplayName = document.getElementById('file-display-name');
  const fileTypeBadge = document.getElementById('file-type-badge');
  const fileDescription = document.getElementById('file-description');
  const formatSelectionCard = document.getElementById('format-selection-card');
  
  if (fileIconDisplay) fileIconDisplay.className = `fa ${fileInfo.icon}`;
  if (fileDisplayName) fileDisplayName.textContent = fileInfo.displayName;
  if (fileTypeBadge) {
    fileTypeBadge.textContent = fileInfo.type.toUpperCase();
    fileTypeBadge.className = `type-badge ${fileInfo.type}-badge`;
  }
  if (fileDescription) {
    fileDescription.textContent = fileInfo.description;
  }
  
  // 显示格式选择（仅对DOCX文件）
  if (formatSelectionCard && fileInfo.type === 'docx') {
    formatSelectionCard.style.display = 'block';
  }
  
  if (fileInfoCard) fileInfoCard.style.display = 'flex';
  
  console.log('文件信息设置完成');
}

// 获取文件显示信息
function getFileDisplayInfo(filename) {
  const ext = filename.toLowerCase().includes('.pdf') ? 'pdf' : 'docx';
  
  const fileMap = {
    'FinalOST.pdf': {
      displayName: 'Final Ontario Student Transcript',
      type: 'pdf',
      icon: 'fa-file-pdf',
      description: 'Generate final transcripts for selected students with completed course information.'
    },
    'FinalOST.docx': {
      displayName: 'Final Ontario Student Transcript',
      type: 'docx',
      icon: 'fa-file-word',
      description: 'Generate final transcripts for selected students with auto-filled student data.'
    },
    'OST.pdf': {
      displayName: 'Ontario Student Transcript',
      type: 'pdf',
      icon: 'fa-file-pdf',
      description: 'Generate current transcripts for selected students with course information.'
    },
    'OST.docx': {
      displayName: 'Ontario Student Transcript',
      type: 'docx',
      icon: 'fa-file-word',
      description: 'Generate current transcripts for selected students with auto-filled student data.'
    }
  };
  
  return fileMap[filename] || {
    displayName: filename.replace(/\.[^/.]+$/, ""),
    type: ext,
    icon: ext === 'pdf' ? 'fa-file-pdf' : 'fa-file-word',
    description: `Generate ${ext.toUpperCase()} documents for selected students with auto-filled student data.`
  };
}

// 加载学生数据用于生成页面
async function loadStudentsForGeneration() {
  console.log('开始加载学生数据');
  
  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const studentTableContainer = document.getElementById('student-table-container');
  const bulkActions = document.getElementById('bulk-actions');
  
  try {
    // 显示加载状态
    if (loadingMessage) loadingMessage.style.display = 'block';
    if (errorMessage) errorMessage.style.display = 'none';
    if (studentTableContainer) studentTableContainer.style.display = 'none';
    if (bulkActions) bulkActions.style.display = 'none';
    
    const response = await fetch('/api/students');
    
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }
    
    const students = await response.json();
    console.log('成功获取学生数据:', students.length, '条记录');
    
    // 隐藏加载状态
    if (loadingMessage) loadingMessage.style.display = 'none';
    
    if (students.length === 0) {
      showErrorState('未找到任何学生记录。');
      return;
    }
    
    // 存储数据
    window.allStudents = students;
    window.filteredStudents = [...students];
    
    // 显示学生表格
    displayStudentsForGeneration(students);
    updateSelectionSummary();
    
    // 显示表格和操作按钮
    if (studentTableContainer) studentTableContainer.style.display = 'block';
    if (bulkActions) bulkActions.style.display = 'flex';
    
  } catch (error) {
    console.error('加载学生数据失败:', error);
    if (loadingMessage) loadingMessage.style.display = 'none';
    
    let errorMsg = '加载学生数据失败。';
    if (error.message.includes('404')) {
      errorMsg = '学生服务不可用。请检查服务器配置。';
    } else if (error.message.includes('Failed to fetch')) {
      errorMsg = '无法连接到服务器。请检查网络连接。';
    } else {
      errorMsg = `加载学生数据失败: ${error.message}`;
    }
    showErrorState(errorMsg);
  }
}

// 显示学生数据（带选择框）
function displayStudentsForGeneration(students) {
  console.log('显示学生数据用于生成：', students.length, '条记录');
  
  const studentTableBody = document.getElementById('student-table-body');
  if (!studentTableBody) {
    console.error('未找到学生表格元素');
    return;
  }

  // 清空表格
  studentTableBody.innerHTML = '';

  if (students.length === 0) {
    showEmptyStateGeneration();
    return;
  }

  // 填充学生数据
  students.forEach((student, index) => {
    const row = document.createElement('tr');
    const studentId = `student_${index}_${student.oen.replace(/-/g, '')}`;
    const isSelected = window.selectedStudents.has(studentId);
    
    row.className = isSelected ? 'selected' : '';
    
    // 为行添加点击事件（排除复选框点击）
    row.addEventListener('click', function(e) {
      if (e.target.type !== 'checkbox' && e.target.tagName !== 'LABEL') {
        const checkbox = row.querySelector('.student-checkbox');
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change'));
        }
      }
    });
    
    row.innerHTML = `
      <td class="checkbox-column">
        <input type="checkbox" id="${studentId}" class="student-checkbox" 
               data-student-id="${studentId}" 
               data-oen="${student.oen.replace(/-/g, '')}"
               ${isSelected ? 'checked' : ''}>
        <label for="${studentId}"></label>
      </td>
      <td class="student-name">${student.studentName || 'N/A'}</td>
      <td class="student-oen">${student.oen || 'N/A'}</td>
      <td class="enrollment-date">${student.enrollmentDate || 'N/A'}</td>
      <td class="graduation-date">${student.graduationDate || 'N/A'}</td>
    `;
    
    studentTableBody.appendChild(row);
  });
  
  // 设置复选框事件监听器
  setupStudentCheckboxListeners();
  
  console.log(`显示了 ${students.length} 条学生记录`);
}

// 设置学生复选框事件监听器
function setupStudentCheckboxListeners() {
  const checkboxes = document.querySelectorAll('.student-checkbox');
  
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const studentId = this.dataset.studentId;
      const row = this.closest('tr');
      
      if (this.checked) {
        window.selectedStudents.add(studentId);
        row.classList.add('selected');
      } else {
        window.selectedStudents.delete(studentId);
        row.classList.remove('selected');
      }
      
      updateSelectionSummary();
      updateGenerateButton();
      updateSelectAllCheckbox();
    });
  });
  
  console.log(`设置了 ${checkboxes.length} 个学生复选框事件监听器`);
}


function setupGenerationPageEventListeners() {
  // 搜索功能
  const searchInput = document.getElementById('student-search');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        performGenerationSearch(this.value.trim());
      }, 300);
    });
  }
  
  // 清除搜索
  const clearSearch = document.getElementById('clear-search');
  if (clearSearch) {
    clearSearch.addEventListener('click', function() {
      if (searchInput) searchInput.value = '';
      performGenerationSearch('');
    });
  }
  
  // 全选/清除全选
  const selectAllBtn = document.getElementById('select-all');
  const clearAllBtn = document.getElementById('clear-all');
  const selectAllCheckbox = document.getElementById('select-all-checkbox');
  
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', selectAllStudents);
  }
  
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', clearAllSelectionsForGeneration);
  }
  
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function() {
      if (this.checked) {
        selectAllStudents();
      } else {
        clearAllSelectionsForGeneration();
      }
    });
  }
  
  // 修正：使用filegenerate专用的按钮事件监听器
  const generateBtn = document.getElementById('generate-selected');
  if (generateBtn) {
    generateBtn.addEventListener('click', handleFileGenerateSelected);
  }
  
  // 排序功能
  const sortableHeaders = document.querySelectorAll('.sortable');
  sortableHeaders.forEach(header => {
    header.style.cursor = 'pointer';
    header.addEventListener('click', function() {
      const column = this.dataset.column;
      sortStudentsForGeneration(column);
    });
  });
  
  console.log('生成页面事件监听器设置完成');
}


// 执行搜索
function performGenerationSearch(searchTerm) {
  console.log('执行搜索：', searchTerm);
  
  if (searchTerm === '') {
    window.filteredStudents = [...window.allStudents];
  } else {
    window.filteredStudents = window.allStudents.filter(student => {
      const name = (student.studentName || '').toLowerCase();
      const oen = (student.oen || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      
      return name.includes(term) || oen.includes(term);
    });
  }
  
  displayStudentsForGeneration(window.filteredStudents);
  updateSelectionSummary();
  
  console.log(`搜索结果：${window.filteredStudents.length} 条记录`);
}

// 排序学生数据
function sortStudentsForGeneration(column) {
  if (window.currentSortColumn === column) {
    window.sortDirection = window.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    window.sortDirection = 'asc';
    window.currentSortColumn = column;
  }

  window.filteredStudents.sort((a, b) => {
    let valueA, valueB;

    switch (column) {
      case 'studentName':
        valueA = (a.studentName || '').toLowerCase();
        valueB = (b.studentName || '').toLowerCase();
        break;
      case 'enrollmentDate':
      case 'graduationDate':
        valueA = a[column] ? new Date(a[column]) : new Date('1900-01-01');
        valueB = b[column] ? new Date(b[column]) : new Date('1900-01-01');
        break;
      default:
        return 0;
    }

    let result;
    if (column === 'studentName') {
      result = valueA.localeCompare(valueB);
    } else {
      result = valueA.getTime() - valueB.getTime();
    }

    return window.sortDirection === 'desc' ? -result : result;
  });

  displayStudentsForGeneration(window.filteredStudents);
  updateSortIndicators(column);
  console.log(`按 ${column} ${window.sortDirection === 'asc' ? '升序' : '降序'} 排序`);
}

// 更新排序指示器
function updateSortIndicators(activeColumn) {
  const sortableHeaders = document.querySelectorAll('.sortable');
  
  sortableHeaders.forEach(header => {
    const icon = header.querySelector('i');
    if (header.dataset.column === activeColumn) {
      icon.className = window.sortDirection === 'asc' ? 'fa fa-sort-up' : 'fa fa-sort-down';
      icon.style.color = '#007bff';
    } else {
      icon.className = 'fa fa-sort';
      icon.style.color = '';
    }
  });
}

// 全选学生
function selectAllStudents() {
  console.log('全选学生');
  
  const checkboxes = document.querySelectorAll('.student-checkbox');
  checkboxes.forEach(checkbox => {
    if (!checkbox.checked) {
      checkbox.checked = true;
      const studentId = checkbox.dataset.studentId;
      window.selectedStudents.add(studentId);
      checkbox.closest('tr').classList.add('selected');
    }
  });
  
  updateSelectionSummary();
  updateGenerateButton();
  updateSelectAllCheckbox();
}

// 清除所有选择
function clearAllSelectionsForGeneration() {
  console.log('清除文件生成页面的所有选择');
  
  // 清空选择集合
  window.selectedStudents.clear();
  
  // 取消所有复选框的选中状态并移除选中样式
  const checkboxes = document.querySelectorAll('.student-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
    const row = checkbox.closest('tr');
    if (row) {
      row.classList.remove('selected');
    }
  });
  
  updateSelectionSummary();
  updateGenerateButton();
  updateSelectAllCheckbox();
  
  console.log('已清除所有选择，当前选中数量:', window.selectedStudents.size);
}


// 更新选择摘要
function updateSelectionSummary() {
  const selectedCount = document.getElementById('selected-count');
  const totalCount = document.getElementById('total-count');
  const actionSummary = document.getElementById('action-summary');
  
  const selected = window.selectedStudents.size;
  const total = window.filteredStudents.length;
  
  if (selectedCount) selectedCount.textContent = selected;
  if (totalCount) totalCount.textContent = total;
  
  if (actionSummary) {
    if (selected === 0) {
      actionSummary.textContent = 'Select students to generate documents';
    } else if (selected === 1) {
      actionSummary.textContent = '1 student selected for document generation';
    } else {
      actionSummary.textContent = `${selected} students selected for document generation`;
    }
  }
}

// 更新全选复选框状态
function updateSelectAllCheckbox() {
  const selectAllCheckbox = document.getElementById('select-all-checkbox');
  if (!selectAllCheckbox) return;
  
  const total = window.filteredStudents.length;
  const selected = window.selectedStudents.size;
  
  if (selected === 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
  } else if (selected === total) {
    selectAllCheckbox.checked = true;
    selectAllCheckbox.indeterminate = false;
  } else {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = true;
  }
}

// 更新生成按钮状态
function updateGenerateButton() {
  const generateBtn = document.getElementById('generate-selected');
  if (!generateBtn) return;
  
  const selectedCount = window.selectedStudents.size;
  generateBtn.disabled = selectedCount === 0;
  
  if (selectedCount === 0) {
    generateBtn.innerHTML = '<i class="fa fa-file-export"></i> Generate Selected Documents';
  } else if (selectedCount === 1) {
    generateBtn.innerHTML = '<i class="fa fa-file-export"></i> Generate 1 Document';
  } else {
    generateBtn.innerHTML = `<i class="fa fa-file-export"></i> Generate ${selectedCount} Documents`;
  }
}

// 修改：filegenerate专用 - 处理生成选中文档
async function handleFileGenerateSelected() {
  const selectedCount = window.selectedStudents.size;
  if (selectedCount === 0) {
    showGenerationError('Please select at least one student.');
    return;
  }
  
  console.log(`开始生成 ${selectedCount} 个文档`);
  
  // 获取选中的学生OEN列表
  const selectedOENs = [];
  const checkboxes = document.querySelectorAll('.student-checkbox:checked');
  checkboxes.forEach(checkbox => {
    selectedOENs.push(checkbox.dataset.oen);
  });
  
  // 获取输出格式 - 从当前页面的格式选择获取
  const formatRadios = document.querySelectorAll('input[name="output-format"]');
  let selectedFormat = 'docx'; // 默认格式
  formatRadios.forEach(radio => {
    if (radio.checked) {
      selectedFormat = radio.value;
    }
  });
  
  console.log('选中的OEN列表:', selectedOENs);
  console.log('选择的格式:', selectedFormat);
  console.log('当前文件名:', window.currentFilename);
  
  // 显示进度模态框
  showProgressModal();
  
  try {
    if (selectedOENs.length === 1) {
      // 单个文件生成
      await generateFileForSingleStudent(selectedOENs[0], selectedFormat);
    } else {
      // 批量文件生成 - 同一个文件给多个学生
      await generateFileForMultipleStudents(selectedOENs, selectedFormat);
    }
    
    // 成功后清除选择
    clearAllSelectionsForGeneration();
    showGenerationSuccess(`Successfully generated ${selectedCount} document(s)`);
    
  } catch (error) {
    console.error('文档生成失败:', error);
    showGenerationError(`Document generation failed: ${error.message}`);
  } finally {
    hideProgressModal();
  }
}



// 新增：filegenerate专用 - 生成单个文档
async function generateFileForSingleStudent(oen, format) {
  console.log(`生成单个文档: OEN=${oen}, 格式=${format}`);
  
  updateProgressModal('Generating document...', 0);
  
  const response = await fetch(`/api/filegenerate/${window.currentFilename}/generate/${oen}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ format })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error: ${response.status}`);
  }
  
  updateProgressModal('Download starting...', 100);
  
  // 获取文件数据并触发下载
  const blob = await response.blob();
  const contentDisposition = response.headers.get('Content-Disposition');
  let fileName = window.currentFilename;
  
  if (contentDisposition) {
    const matches = contentDisposition.match(/filename="([^"]+)"/);
    if (matches) {
      fileName = matches[1];
    }
  }
  
  downloadBlob(blob, fileName);
  console.log(`✅ 单个文档生成成功: ${fileName}`);
}



async function generateFileForMultipleStudents(oens, format) {
  console.log(`批量生成文档: ${oens.length} 个学生, 格式=${format}, 文件=${window.currentFilename}`);
  
  updateProgressModal('Preparing batch generation...', 0);
  
  // 构造批量请求数据 - 同一个文件给多个学生
  const files = oens.map(oen => ({
    filename: window.currentFilename,
    format: format,
    oen: oen
  }));
  
  updateProgressModal('Generating documents...', 25);
  
  const response = await fetch('/api/filegenerate/generate-batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ files })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error: ${response.status}`);
  }
  
  updateProgressModal('Preparing download...', 75);
  
  // 获取ZIP文件数据并触发下载
  const blob = await response.blob();
  const contentDisposition = response.headers.get('Content-Disposition');
  let fileName = 'Documents.zip';
  
  if (contentDisposition) {
    const matches = contentDisposition.match(/filename="([^"]+)"/);
    if (matches) {
      fileName = matches[1];
    }
  }
  
  updateProgressModal('Download starting...', 100);
  downloadBlob(blob, fileName);
  console.log(`✅ 批量文档生成成功: ${fileName}`);
}


// 显示进度模态框
function showProgressModal() {
  const modal = document.getElementById('progress-modal');
  if (modal) {
    modal.style.display = 'flex';
    updateProgressModal('Initializing...', 0);
  }
}

// 更新进度模态框
function updateProgressModal(text, percentage) {
  const progressText = document.getElementById('progress-text');
  const progressFill = document.getElementById('progress-fill');
  const progressDetails = document.getElementById('progress-details');
  
  if (progressText) progressText.textContent = text;
  if (progressFill) progressFill.style.width = `${percentage}%`;
  if (progressDetails) {
    const selected = window.selectedStudents.size;
    const processed = Math.floor((percentage / 100) * selected);
    progressDetails.textContent = `${processed} of ${selected} processed`;
  }
}

// 隐藏进度模态框
function hideProgressModal() {
  const modal = document.getElementById('progress-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// 下载Blob文件
function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  
  document.body.appendChild(a);
  a.click();
  
  // 清理
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  
  console.log(`📥 开始下载: ${filename}`);
}

// 显示生成成功消息
function showGenerationSuccess(message) {
  showOperationMessage(message, 'success');
}

// 显示生成错误消息
function showGenerationError(message) {
  showOperationMessage(message, 'error');
}

// 显示操作消息
function showOperationMessage(message, type) {
  // 移除现有的操作消息
  const existingMessage = document.querySelector('.operation-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // 创建新的操作消息
  const messageDiv = document.createElement('div');
  messageDiv.className = `operation-message ${type}-message`;
  
  const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
  messageDiv.innerHTML = `
    <i class="fa ${icon}"></i>
    <span>${message}</span>
    <button onclick="this.parentElement.remove()">
      <i class="fa fa-times"></i>
    </button>
  `;
  
  // 插入到主内容区域的顶部
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    mainContent.insertBefore(messageDiv, mainContent.firstChild);
  }
  
  // 自动隐藏（成功消息3秒，错误消息5秒）
  const hideDelay = type === 'success' ? 3000 : 5000;
  setTimeout(() => {
    if (messageDiv.parentElement) {
      messageDiv.remove();
    }
  }, hideDelay);
  
  console.log(`显示${type}消息:`, message);
}

// 显示错误状态
function showErrorState(message) {
  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const studentTableContainer = document.getElementById('student-table-container');
  const bulkActions = document.getElementById('bulk-actions');
  
  // 隐藏其他元素
  if (loadingMessage) loadingMessage.style.display = 'none';
  if (studentTableContainer) studentTableContainer.style.display = 'none';
  if (bulkActions) bulkActions.style.display = 'none';
  
  // 显示错误消息
  if (errorText) errorText.textContent = message;
  if (errorMessage) errorMessage.style.display = 'block';
  
  console.error('显示错误状态:', message);
}

// 显示空状态
function showEmptyStateGeneration() {
  const searchInput = document.getElementById('student-search');
  const searchTerm = searchInput ? searchInput.value.trim() : '';
  const message = searchTerm 
    ? `No students found matching "${searchTerm}"` 
    : 'No students available';
    
  const studentTableBody = document.getElementById('student-table-body');
  if (studentTableBody) {
    studentTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: #6c757d;">
          <i class="fa fa-users" style="font-size: 24px; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
          ${message}
          ${searchTerm ? '<br><small>Try using different search keywords</small>' : ''}
        </td>
      </tr>
    `;
  }
}


// 修改：更新生成按钮文本以反映当前操作
function updateGenerateButton() {
  const generateBtn = document.getElementById('generate-selected');
  if (!generateBtn) return;
  
  const selectedCount = window.selectedStudents.size;
  generateBtn.disabled = selectedCount === 0;
  
  // 获取当前文件信息
  const fileInfo = getFileDisplayInfo(window.currentFilename || '');
  const fileName = fileInfo.displayName || 'Document';
  
  if (selectedCount === 0) {
    generateBtn.innerHTML = `<i class="fa fa-file-export"></i> Generate ${fileName}`;
  } else if (selectedCount === 1) {
    generateBtn.innerHTML = `<i class="fa fa-file-export"></i> Generate ${fileName} (1 Student)`;
  } else {
    generateBtn.innerHTML = `<i class="fa fa-file-export"></i> Generate ${fileName} (${selectedCount} Students)`;
  }
}


// ========================================
// filegenerate.html 相关功能结束
// ========================================

// ========================================
// studentfile.html 相关功能
// ========================================

// ========================================
// 简化的 studentfile.html 相关功能 - 仅查看模板文件
// ========================================

// 初始化学生文件页面
function initStudentFilePage() {
  console.log('初始化学生文件页面');
  
  // 获取URL参数中的OEN
  const urlParams = new URLSearchParams(window.location.search);
  const oen = urlParams.get('oen');
  
  console.log('从URL获取的OEN:', oen);
  console.log('完整URL:', window.location.href);
  console.log('URL参数:', window.location.search);
  
  if (!oen) {
    console.error('未找到OEN参数');
    renderErrorMessage('错误：未找到学生OEN参数。请从学生详情页面进入此页面。');
    return;
  }

  window.currentStudentOEN = oen;
  // 设置返回学生详情的链接
  setupStudentDetailLink(oen);

  
  // 加载学生信息
  loadStudentInfoForFiles(oen);
  
  // 加载模板文件（仅查看）
  loadTemplateFiles();

  setupGenerateButtonListener();
}

// 设置学生详情链接
function setupStudentDetailLink(oen) {
  const studentDetailLink = document.getElementById('student-detail-link');
  if (studentDetailLink) {
    studentDetailLink.href = `studentdetail.html?oen=${oen}`;
  }
}

// 加载学生信息用于文件页面
async function loadStudentInfoForFiles(oen) {
  console.log('加载学生信息用于文件页面');
  
  try {
    const response = await fetch(`/api/student/${oen}/detail`);
    
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }
    
    const student = await response.json();
    console.log('成功获取学生数据:', student);
    
    // 显示学生信息
    displayStudentInfoForFiles(student);
    
  } catch (error) {
    console.error('加载学生信息失败:', error);
    renderErrorMessage('错误：未找到学生OEN参数。请从学生详情页面进入此页面。');
  }
}

// 显示学生信息
function displayStudentInfoForFiles(student) {
  console.log('显示学生信息');
  
  const studentInfoDiv = document.getElementById('student-info');
  const studentNameEl = document.getElementById('student-name');
  const studentOenEl = document.getElementById('student-oen');
  const studentGradeEl = document.getElementById('student-grade');
  
  if (studentNameEl) {
    studentNameEl.textContent = `${student.firstName} ${student.lastName}`;
  }
  
  if (studentOenEl) {
    studentOenEl.textContent = student.oen;
  }
  
  if (studentGradeEl) {
    studentGradeEl.textContent = student.grade || 'N/A';
  }
  
  if (studentInfoDiv) {
    studentInfoDiv.style.display = 'block';
  }
  
  console.log('学生信息显示完成');
}

// 加载模板文件（简化版 - 仅查看）
async function loadTemplateFiles() {
  console.log('开始加载模板文件');
  
  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const filesGrid = document.getElementById('files-grid');
  
  try {
    // 显示加载状态
    if (loadingMessage) loadingMessage.style.display = 'block';
    if (errorMessage) errorMessage.style.display = 'none';
    if (filesGrid) filesGrid.style.display = 'none';
    
    const response = await fetch('/api/templates');
    
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }
    
    const templates = await response.json();
    console.log('成功获取模板文件:', templates);
    
    // 隐藏加载状态
    if (loadingMessage) loadingMessage.style.display = 'none';
    
    if (templates.length === 0) {
      renderErrorMessage('未找到任何模板文件。请确保 templates 文件夹中包含 PDF 或 DOCX 文件。');
      return;
    }
    
    // 显示文件（仅查看）
    displayTemplateFiles(templates);
    
  } catch (error) {
    console.error('加载模板文件失败:', error);
    if (loadingMessage) loadingMessage.style.display = 'none';
    // 根据错误类型显示不同的错误消息
    let errorMsg = '加载模板文件失败。';
    if (error.message.includes('404')) {
        errorMsg = '模板服务不可用。请检查服务器配置。';
    } else if (error.message.includes('Failed to fetch')) {
        errorMsg = '无法连接到服务器。请检查网络连接。';
    } else {
        errorMsg = `加载模板文件失败: ${error.message}`;
    }
    renderErrorMessage(errorMsg);
  }
}

// 显示模板文件（简化版 - 移除下载功能）
function displayTemplateFiles(templates) {
  console.log('显示模板文件');
  
  const filesGrid = document.getElementById('files-grid');
  if (!filesGrid) {
    console.error('未找到文件网格容器');
    return;
  }
  
  // 清空现有内容
  filesGrid.innerHTML = '';
  
  templates.forEach(template => {
    const fileCard = createFileCard(template);
    filesGrid.appendChild(fileCard);
  });
  
  // 显示文件网格
  filesGrid.style.display = 'grid';
  
  console.log(`显示了 ${templates.length} 个模板文件`);

  // 设置复选框事件监听器
    setupFileCheckboxListeners();
}


// 修复：创建文件卡片（添加格式选择功能）
function createFileCard(template) {
  const card = document.createElement('div');
  card.className = 'file-card';
  
  // 确定文件类型的CSS类
  const typeClass = template.type === 'pdf' ? 'pdf-file' : 'docx-file';
  card.classList.add(typeClass);
  
  // 格式化最后修改时间
  const lastModified = new Date(template.lastModified).toLocaleDateString();
  
  // 检查文件类型以确定可用的格式选项
  const isDocx = template.type === 'docx';
  const isPdf = template.type === 'pdf';
  
  // 根据文件类型生成不同的格式选项
  let formatOptionsHtml = '';
  
  if (isDocx) {
    // DOCX文件：提供Word、PDF、Both选项
    formatOptionsHtml = `
    <div class="format-selection" id="format-${template.name}" style="display: none;">
      <label class="format-label">Output Format:</label>
      <div class="format-options">
        <label class="format-option">
          <input type="radio" name="format-${template.name}" value="docx" checked>
          <i class="fa fa-file-word"></i> Word
        </label>
        <label class="format-option">
          <input type="radio" name="format-${template.name}" value="pdf">
          <i class="fa fa-file-pdf"></i> PDF
        </label>
        <label class="format-option">
          <input type="radio" name="format-${template.name}" value="both">
          <i class="fa fa-files-o"></i> Both
        </label>
      </div>
    </div>`;
  } else if (isPdf) {
    // PDF文件：只提供PDF选项，但保持界面一致性
    formatOptionsHtml = `
    <div class="format-selection" id="format-${template.name}" style="display: none;">
      <label class="format-label">Output Format:</label>
      <div class="format-options">
        <label class="format-option">
          <input type="radio" name="format-${template.name}" value="original" checked>
          <i class="fa fa-file-pdf"></i> PDF Template
        </label>
      </div>
      <p class="format-note">
        <i class="fa fa-info-circle"></i> This is a PDF template file that will be downloaded as-is.
      </p>
    </div>`;
  }
  
  card.innerHTML = `
  <div class="file-checkbox">
    <input type="checkbox" id="file-${template.name}" class="file-select-checkbox" data-filename="${template.name}">
    <label for="file-${template.name}"></label>
  </div>
  <div class="file-icon">
    <i class="fa ${template.icon}"></i>
  </div>
  <div class="file-info">
    <h3 class="file-name">${template.displayName}</h3>
    <p class="file-details">
      <span class="file-type">${template.type.toUpperCase()}</span>
      <span class="file-size">${template.size}</span>
    </p>
    <p class="file-description">
      ${isDocx ? 
        `${template.type.toUpperCase()} template with auto-filled student data.` :
        `${template.type.toUpperCase()} template file ready for download.`
      }
    </p>
    ${formatOptionsHtml}
    <p class="file-modified">
      <i class="fa fa-clock"></i> Last modified: ${lastModified}
    </p>
  </div>
  <div class="file-status">
    <span class="status-badge available">
      <i class="fa fa-check-circle"></i> ${isDocx ? 'Ready to Generate' : 'Ready to Download'}
    </span>
  </div>
`;
  
  // 添加悬停效果
  card.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-2px)';
    this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  });
  
  card.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0)';
    this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  });
  
  // 修复：点击整个卡片切换选中状态的功能
  card.addEventListener('click', function(e) {
    // 如果点击的不是复选框、单选框或标签，则切换复选框状态
    if (e.target.type !== 'checkbox' && e.target.type !== 'radio' && e.target.tagName !== 'LABEL') {
      const checkbox = card.querySelector('.file-select-checkbox');
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        
        // 触发change事件以更新格式选择和按钮状态
        checkbox.dispatchEvent(new Event('change'));
        
        console.log(`卡片点击切换: ${template.name} = ${checkbox.checked}`);
      }
    }
  });
  
  return card;
}

// 修复：改进的文件复选框事件监听器设置
function setupFileCheckboxListeners() {
  const checkboxes = document.querySelectorAll('.file-select-checkbox');
  
  console.log(`设置 ${checkboxes.length} 个复选框事件监听器`);
  
  checkboxes.forEach((checkbox, index) => {
    // 移除旧的事件监听器（如果存在）
    checkbox.removeEventListener('change', handleCheckboxChange);
    
    // 添加新的事件监听器
    checkbox.addEventListener('change', handleCheckboxChange);
    
    console.log(`已设置复选框 ${index + 1}: ${checkbox.dataset.filename}`);
  });
  
  // 初始化按钮状态
  updateGenerateButtonState();
}

// 新增：复选框变化处理函数
function handleCheckboxChange(event) {
  const checkbox = event.target;
  const filename = checkbox.dataset.filename;
  const isChecked = checkbox.checked;
  
  console.log(`复选框变化: ${filename} = ${isChecked}`);
  
  // 显示或隐藏格式选择
  toggleFormatSelection(filename, isChecked);
  
  // 更新生成按钮状态
  updateGenerateButtonState();
  
  // 更新卡片样式
  updateCardStyle(checkbox, isChecked);
}

// 新增：更新卡片样式
function updateCardStyle(checkbox, isChecked) {
  const card = checkbox.closest('.file-card');
  if (card) {
    if (isChecked) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  }
}

// 修改：更新生成按钮状态（考虑Report Card文件）
function updateGenerateButtonState() {
  const checkboxes = document.querySelectorAll('.file-select-checkbox');
  const checkedBoxes = document.querySelectorAll('.file-select-checkbox:checked');
  const generateButton = document.getElementById('generate-selected');
  
  console.log(`按钮状态检查: ${checkedBoxes.length}/${checkboxes.length} 个文件选中`);
  
  if (!generateButton) {
    console.error('未找到生成按钮元素');
    return;
  }
  
  const hasSelection = checkedBoxes.length > 0;
  generateButton.disabled = !hasSelection;
  
  if (hasSelection) {
    // 分离有效文件和Report Card文件
    const selectedFiles = Array.from(checkedBoxes).map(cb => cb.dataset.filename);
    const reportCardFiles = selectedFiles.filter(filename => isReportCardFile(filename));
    const validFiles = selectedFiles.filter(filename => !isReportCardFile(filename));
    
    console.log('选中文件分析:', {
      total: selectedFiles.length,
      reportCard: reportCardFiles.length,
      valid: validFiles.length
    });
    
    // 更新按钮文本
    if (validFiles.length === 0) {
      // 只选中了Report Card文件
      generateButton.textContent = `Generate ${selectedFiles.length} File(s) (Report Card Only)`;
      generateButton.classList.add('warning');
    } else if (reportCardFiles.length > 0) {
      // 混合选择（包含Report Card和其他文件）
      generateButton.textContent = `Generate ${validFiles.length} File(s) (${reportCardFiles.length} Report Card Excluded)`;
      generateButton.classList.add('warning');
    } else {
      // 只有有效文件
      let formatInfo = [];
      let allValid = true;
      
      checkedBoxes.forEach(checkbox => {
        const filename = checkbox.dataset.filename;
        const format = getSelectedFormat(filename);
        
        if (filename.toLowerCase().endsWith('.docx')) {
          if (format === 'both') {
            formatInfo.push('DOCX+PDF');
          } else if (format === 'pdf') {
            formatInfo.push('PDF');
          } else {
            formatInfo.push('DOCX');
          }
        } else if (filename.toLowerCase().endsWith('.pdf')) {
          formatInfo.push('PDF');
        } else {
          console.warn(`未知文件类型: ${filename}`);
          allValid = false;
        }
      });
      
      if (allValid) {
        const uniqueFormats = [...new Set(formatInfo)];
        generateButton.textContent = `Generate ${validFiles.length} File(s) (${uniqueFormats.join(', ')})`;
        generateButton.classList.remove('warning', 'error');
      } else {
        generateButton.textContent = 'Generate Selected Files';
        generateButton.classList.add('error');
      }
    }
  } else {
    generateButton.textContent = 'Generate Selected File(s)';
    generateButton.classList.remove('warning', 'error');
  }
  
  console.log(`按钮状态更新完成: ${generateButton.textContent}, 禁用状态: ${generateButton.disabled}`);
}

// 获取选中的文件列表
function getSelectedFiles() {
  const checkedBoxes = document.querySelectorAll('.file-select-checkbox:checked');
  return Array.from(checkedBoxes).map(checkbox => checkbox.dataset.filename);
}
// 显示错误消息
function renderErrorMessage(message) {
  console.error('显示错误:', message);
  
  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const filesGrid = document.getElementById('files-grid');
  
  // 隐藏加载消息和文件网格
  if (loadingMessage) loadingMessage.style.display = 'none';
  if (filesGrid) filesGrid.style.display = 'none';
  
  // 显示错误消息
  if (errorText) errorText.textContent = message;
  if (errorMessage) errorMessage.style.display = 'block';
}

// 显示成功消息（保留用于未来功能）
function showSuccess(message) {
  // 创建成功消息元素（如果不存在）
  let successMessage = document.getElementById('success-message');
  
  if (!successMessage) {
    successMessage = document.createElement('div');
    successMessage.id = 'success-message';
    successMessage.className = 'success-message';
    successMessage.innerHTML = `
      <i class="fa fa-check-circle"></i>
      <span id="success-text">${message}</span>
    `;
    
    // 插入到主内容区域的顶部
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.insertBefore(successMessage, mainContent.firstChild);
    }
  } else {
    const successText = document.getElementById('success-text');
    if (successText) successText.textContent = message;
    successMessage.style.display = 'block';
  }
  
  // 3秒后自动隐藏
  setTimeout(() => {
    if (successMessage) {
      successMessage.style.display = 'none';
    }
  }, 3000);
  
  console.log('显示成功消息:', message);
}

// ========================================
// 显示文件，多选框
// ========================================

// =========================================
// 处理docx文件
// =========================================

// 新增：设置生成按钮事件监听器
function setupGenerateButtonListener() {
  const generateButton = document.getElementById('generate-selected');
  if (generateButton) {
    generateButton.addEventListener('click', handleGenerateSelectedFiles);
    console.log('✅ 生成按钮事件监听器已设置');
  }
}

// 修改：处理生成选中文件的事件（添加Report Card检查）
async function handleGenerateSelectedFiles() {
  const selectedFiles = getSelectedFiles();
  const oen = window.currentStudentOEN;
  
  if (!selectedFiles.length) {
    showError('请至少选择一个文件');
    return;
  }
  
  if (!oen) {
    showError('未找到学生OEN信息');
    return;
  }
  
  console.log('开始生成文件:', selectedFiles, 'for OEN:', oen);
  
  // 检查是否包含Report Card文件
  const reportCardFiles = selectedFiles.filter(filename => isReportCardFile(filename));
  const validFiles = selectedFiles.filter(filename => !isReportCardFile(filename));
  
  // 如果包含Report Card文件，显示提示信息
  if (reportCardFiles.length > 0) {
    showReportCardMessage();
    console.log('检测到Report Card文件:', reportCardFiles);
  }
  
  // 如果没有有效文件可以生成
  if (validFiles.length === 0) {
    console.log('没有有效文件可以生成');
    return;
  }
  
  console.log('有效文件列表:', validFiles);
  
  // 显示加载状态
  const generateButton = document.getElementById('generate-selected');
  const originalText = generateButton.textContent;
  generateButton.disabled = true;
  generateButton.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...';
  
  try {
    if (validFiles.length === 1) {
      // 单个文件生成
      await generateSingleFile(validFiles[0], oen);
    } else {
      // 多个文件批量生成
      await generateMultipleFiles(validFiles, oen);
    }
    
    // 显示成功消息
    showSuccess(`Successfully generated ${validFiles.length} file(s)`);
    
    // 取消选中所有复选框
    clearAllSelections();
    
  } catch (error) {
    console.error('生成文件失败:', error);
    showError(`生成文件失败: ${error.message}`);
  } finally {
    // 恢复按钮状态
    generateButton.disabled = false;
    generateButton.textContent = originalText;
    updateGenerateButtonState();
  }
}

// 修复：生成单个文件函数 - 确保格式信息正确传递
async function generateSingleFile(filename, oen) {
  console.log(`生成单个文件: ${filename}`);
  
  try {
    // 获取选中的格式
    const selectedFormat = getSelectedFormat(filename);
    console.log(`文件 ${filename} 选择的格式: ${selectedFormat}`);
    
    const response = await fetch(`/api/templates/${filename}/generate/${oen}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        format: selectedFormat  // 确保格式信息被传递
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP错误: ${response.status}`);
    }
    
    // 获取文件数据
    const blob = await response.blob();
    
    // 从响应头获取文件名
    const contentDisposition = response.headers.get('Content-Disposition');
    let fileName = filename;
    if (contentDisposition) {
      const matches = contentDisposition.match(/filename="([^"]+)"/);
      if (matches) {
        fileName = matches[1];
      }
    }
    
    // 触发下载
    downloadBlob(blob, fileName);
    
    console.log(`✅ 单个文件生成成功: ${fileName}`);
    
  } catch (error) {
    console.error('单个文件生成失败:', error);
    throw error;
  }
}

// 修复：批量生成多个文件
async function generateMultipleFiles(filenames, oen) {
  console.log(`批量生成文件: ${filenames.join(', ')}`);
  
  try {
    // 修复：构造正确的请求体格式
    const files = filenames.map(filename => ({
      filename: filename,
      format: getSelectedFormat(filename) // 获取选中的格式
    }));
    
    console.log('发送的文件数据:', files);
    
    const response = await fetch(`/api/templates/generate-multiple/${oen}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ files }) // 修复：使用 files 而不是 filenames
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP错误: ${response.status}`);
    }
    
    // 获取ZIP文件数据
    const blob = await response.blob();
    
    // 从响应头获取文件名
    const contentDisposition = response.headers.get('Content-Disposition');
    let fileName = 'Documents.zip';
    if (contentDisposition) {
      const matches = contentDisposition.match(/filename="([^"]+)"/);
      if (matches) {
        fileName = matches[1];
      }
    }
    
    // 触发下载
    downloadBlob(blob, fileName);
    
    console.log(`✅ 批量文件生成成功: ${fileName}`);
    
  } catch (error) {
    console.error('批量文件生成失败:', error);
    throw error;
  }
}

// 修复：获取选中文件的格式（处理所有文件类型）
function getSelectedFormat(filename) {
  const formatContainer = document.getElementById(`format-${filename}`);
  if (formatContainer) {
    const selectedRadio = formatContainer.querySelector('input[type="radio"]:checked');
    if (selectedRadio) {
      console.log(`文件 ${filename} 选择的格式: ${selectedRadio.value}`);
      return selectedRadio.value;
    }
  }
  
  // 默认格式：根据文件类型确定
  if (filename.toLowerCase().endsWith('.docx')) {
    console.log(`文件 ${filename} 使用默认格式: docx`);
    return 'docx';
  } else if (filename.toLowerCase().endsWith('.pdf')) {
    console.log(`文件 ${filename} 使用默认格式: original`);
    return 'original';
  }
  
  console.log(`文件 ${filename} 使用默认格式: original`);
  return 'original';
}

// 新增：下载Blob文件的辅助函数
function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  
  document.body.appendChild(a);
  a.click();
  
  // 清理
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  
  console.log(`📥 开始下载: ${filename}`);
}

// 新增：清除所有选择
function clearAllSelections() {
  const checkboxes = document.querySelectorAll('.file-select-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  updateGenerateButtonState();
  console.log('✅ 已清除所有文件选择');
}

// 新增：显示错误消息（用于操作反馈）
function showError(message) {
  // 创建或更新错误消息元素
  let errorMessage = document.getElementById('operation-error-message');
  
  if (!errorMessage) {
    errorMessage = document.createElement('div');
    errorMessage.id = 'operation-error-message';
    errorMessage.className = 'operation-message error-message';
    errorMessage.innerHTML = `
      <i class="fa fa-exclamation-triangle"></i>
      <span id="operation-error-text">${message}</span>
      <button onclick="this.parentElement.style.display='none'">
        <i class="fa fa-times"></i>
      </button>
    `;
    
    // 插入到主内容区域的顶部
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.insertBefore(errorMessage, mainContent.firstChild);
    }
  } else {
    const errorText = document.getElementById('operation-error-text');
    if (errorText) errorText.textContent = message;
    errorMessage.style.display = 'flex';
  }
  
  // 5秒后自动隐藏
  setTimeout(() => {
    if (errorMessage) {
      errorMessage.style.display = 'none';
    }
  }, 5000);
  
  console.error('显示错误消息:', message);
}

// 更新：显示成功消息（改进样式）
function showSuccess(message) {
  // 创建成功消息元素（如果不存在）
  let successMessage = document.getElementById('operation-success-message');
  
  if (!successMessage) {
    successMessage = document.createElement('div');
    successMessage.id = 'operation-success-message';
    successMessage.className = 'operation-message success-message';
    successMessage.innerHTML = `
      <i class="fa fa-check-circle"></i>
      <span id="operation-success-text">${message}</span>
      <button onclick="this.parentElement.style.display='none'">
        <i class="fa fa-times"></i>
      </button>
    `;
    
    // 插入到主内容区域的顶部
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.insertBefore(successMessage, mainContent.firstChild);
    }
  } else {
    const successText = document.getElementById('operation-success-text');
    if (successText) successText.textContent = message;
    successMessage.style.display = 'flex';
  }
  
  // 3秒后自动隐藏
  setTimeout(() => {
    if (successMessage) {
      successMessage.style.display = 'none';
    }
  }, 3000);
  
  console.log('显示成功消息:', message);
}

// 修复：创建文件卡片（确保PDF选项正确显示）
function createFileCard(template) {
  const card = document.createElement('div');
  card.className = 'file-card';
  
  // 确定文件类型的CSS类
  const typeClass = template.type === 'pdf' ? 'pdf-file' : 'docx-file';
  card.classList.add(typeClass);
  
  // 格式化最后修改时间
  const lastModified = new Date(template.lastModified).toLocaleDateString();
  
  // 检查文件类型以确定可用的格式选项
  const isDocx = template.type === 'docx';
  const isPdf = template.type === 'pdf';
  
  // 根据文件类型生成不同的格式选项
  let formatOptionsHtml = '';
  
  if (isDocx) {
    // DOCX文件：提供Word、PDF、Both选项
    formatOptionsHtml = `
    <div class="format-selection" id="format-${template.name}" style="display: none;">
      <label class="format-label">Output Format:</label>
      <div class="format-options">
        <label class="format-option">
          <input type="radio" name="format-${template.name}" value="docx" checked>
          <i class="fa fa-file-word"></i> Word
        </label>
        <label class="format-option">
          <input type="radio" name="format-${template.name}" value="pdf">
          <i class="fa fa-file-pdf"></i> PDF
        </label>
        <label class="format-option">
          <input type="radio" name="format-${template.name}" value="both">
          <i class="fa fa-files-o"></i> Both
        </label>
      </div>
    </div>`;
  } else if (isPdf) {
    // PDF文件：提供原始下载选项
    formatOptionsHtml = `
    <div class="format-selection" id="format-${template.name}" style="display: none;">
      <label class="format-label">Output Format:</label>
      <div class="format-options">
        <label class="format-option">
          <input type="radio" name="format-${template.name}" value="original" checked>
          <i class="fa fa-file-pdf"></i> PDF Template
        </label>
      </div>
      <p class="format-note">
        <i class="fa fa-info-circle"></i> This PDF template will be downloaded as-is.
      </p>
    </div>`;
  }
  
  card.innerHTML = `
  <div class="file-checkbox">
    <input type="checkbox" id="file-${template.name}" class="file-select-checkbox" data-filename="${template.name}">
    <label for="file-${template.name}"></label>
  </div>
  <div class="file-icon">
    <i class="fa ${template.icon}"></i>
  </div>
  <div class="file-info">
    <h3 class="file-name">${template.displayName}</h3>
    <p class="file-details">
      <span class="file-type">${template.type.toUpperCase()}</span>
      <span class="file-size">${template.size}</span>
    </p>
    <p class="file-description">
      ${isDocx ? 
        `DOCX template with auto-filled student data. Choose your preferred output format.` :
        `PDF template file ready for download.`
      }
    </p>
    ${formatOptionsHtml}
    <p class="file-modified">
      <i class="fa fa-clock"></i> Last modified: ${lastModified}
    </p>
  </div>
  <div class="file-status">
    <span class="status-badge available">
      <i class="fa fa-check-circle"></i> ${isDocx ? 'Ready to Generate' : 'Ready to Download'}
    </span>
  </div>
`;
  
  // 添加悬停效果
  card.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-2px)';
    this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  });
  
  card.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0)';
    this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  });
  
  // 修复：点击整个卡片切换选中状态的功能
  card.addEventListener('click', function(e) {
    // 如果点击的不是复选框、单选框或标签，则切换复选框状态
    if (e.target.type !== 'checkbox' && e.target.type !== 'radio' && e.target.tagName !== 'LABEL') {
      const checkbox = card.querySelector('.file-select-checkbox');
      if (checkbox) {
        const wasChecked = checkbox.checked;
        checkbox.checked = !wasChecked;
        
        // 显示或隐藏格式选择
        toggleFormatSelection(template.name, checkbox.checked);
        
        // 更新生成按钮状态
        updateGenerateButtonState();
        
        console.log(`卡片点击切换: ${template.name} = ${checkbox.checked}`);
      }
    }
  });
  
  return card;
}

// 新增：切换格式选择显示/隐藏
function toggleFormatSelection(filename, isChecked) {
  const formatContainer = document.getElementById(`format-${filename}`);
  if (formatContainer) {
    formatContainer.style.display = isChecked ? 'block' : 'none';
    console.log(`格式选择切换: ${filename} = ${isChecked ? '显示' : '隐藏'}`);
  } else {
    console.warn(`未找到格式选择容器: format-${filename}`);
  }
}


// =========================================
// 处理docx文件结束
// =========================================


// =========================================
// 处理rc
// =========================================

// 新增：检查文件是否为Report Card
function isReportCardFile(filename) {
  const reportCardFiles = [
    'EVA Report Card - final 2025.docx',
    'EVA Report Card - midterm 2025.docx',
    'EVA Report Card - final 2025.pdf',
    'EVA Report Card - midterm 2025.pdf'
  ];
  return reportCardFiles.includes(filename);
}

// 新增：显示Report Card提示信息
function showReportCardMessage() {
  // 创建或更新提示消息元素
  let reportCardMessage = document.getElementById('report-card-message');
  
  if (!reportCardMessage) {
    reportCardMessage = document.createElement('div');
    reportCardMessage.id = 'report-card-message';
    reportCardMessage.className = 'operation-message info-message';
    reportCardMessage.innerHTML = `
      <i class="fa fa-info-circle"></i>
      <span>本网站仅支持在学生课程页面生成Report Card（英文）</span>
      <button onclick="this.parentElement.style.display='none'">
        <i class="fa fa-times"></i>
      </button>
    `;
    
    // 插入到主内容区域的顶部
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.insertBefore(reportCardMessage, mainContent.firstChild);
    }
  } else {
    reportCardMessage.style.display = 'flex';
  }
  
  // 5秒后自动隐藏
  setTimeout(() => {
    if (reportCardMessage) {
      reportCardMessage.style.display = 'none';
    }
  }, 5000);
  
  console.log('显示Report Card提示信息');
}


// =========================================
// 处理rc
// =========================================

// ========================================
// studentfile.html 相关功能结束
// ========================================



// ========================================
// studentallcourse.html 相关功能
// ========================================



let currentEditMode = null; // 可能的值: null, 'plar', 'courses'


// -----特殊处理PLAR课程
// 修复initStudentAllCoursePage函数




// 加载学生PLAR信息
async function loadStudentPLAR(oen) {
  console.log('开始加载学生PLAR信息，OEN:', oen);
   try {
      const response = await fetch(`/api/student/${oen}/plar`);
    
      if (!response.ok) {
          if (response.status === 404) {
              throw new Error('未找到该学生信息');
          }
          throw new Error(`HTTP错误: ${response.status}`);
      }
    
      const plarData = await response.json();
      console.log('成功获取PLAR数据:', plarData);
    
      // 显示PLAR信息
      displayPLARInfo(plarData);
    
  } catch (error) {
      console.error('加载PLAR信息失败:', error);
      alert(`加载PLAR信息失败: ${error.message}`);
    
      // 显示错误信息
      displayPLARInfo({
          hasPLAR: false,
          isEvaluated: 'N/A',
          evaluationDate: 'N/A',
          totalCredits: 'N/A',
          compulsoryCredits: 'N/A'
      });
  }
}


// 显示PLAR信息
function displayPLARInfo(plarData) {
  console.log('显示PLAR信息:', plarData);
   const elements = {
      'plar-info': plarData.hasPLAR ? 'Yes' : 'No',
      'plar-evaluated': plarData.isEvaluated,
      'plar-date': plarData.evaluationDate,
      'plar-total': plarData.totalCredits,
      'plar-compulsory': plarData.compulsoryCredits
  };
   for (const [id, value] of Object.entries(elements)) {
      const element = document.getElementById(id);
      if (element) {
          element.textContent = value;
      }
  }
   console.log('PLAR信息显示完成');
}


// 更新页面标题显示学生姓名
async function updateStudentNameTitle(oen) {
  try {
      const response = await fetch(`/api/student/${oen}`);
      if (response.ok) {
          const student = await response.json();
          const titleElement = document.getElementById('student-name-title');
          if (titleElement) {
              titleElement.textContent = `${student.firstName} ${student.lastName} - All Courses`;
          }
      }
  } catch (error) {
      console.error('获取学生姓名失败:', error);
  }
}
// -----特殊处理PLAR课程结束






// 加载学生课程数据
async function loadStudentCourses(oen) {
  console.log('开始加载学生课程数据，OEN:', oen);
   try {
      const response = await fetch(`/api/student/${oen}/courses`);
    
      if (!response.ok) {
          if (response.status === 404) {
              throw new Error('未找到该学生的课程信息');
          }
          throw new Error(`HTTP错误: ${response.status}`);
      }
    
      const coursesData = await response.json();
      console.log('成功获取课程数据:', coursesData);
    
      // 显示课程信息
      displayCourses(coursesData);
    
  } catch (error) {
      console.error('加载课程信息失败:', error);
      alert(`加载课程信息失败: ${error.message}`);
  }
}


// 显示课程信息到表格（按状态排序）
function displayCourses(courses) {
  console.log('显示课程信息到表格:', courses);
 
  const tableBody = document.getElementById('course-table-body');
  if (!tableBody) {
      console.error('未找到课程表格体');
      return;
  }
 
  // 清空现有内容
  tableBody.innerHTML = '';
 
  if (!courses || courses.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">暂无课程信息</td></tr>';
      return;
  }
 
  // 按状态排序：IN_PROGRESS -> COMPLETED -> WITHDRAWN
  const statusOrder = {
      'IN_PROGRESS': 1,
      'COMPLETED': 2, 
      'WITHDRAWN': 3
  };
 
  const sortedCourses = courses.sort((a, b) => {
      const orderA = statusOrder[a.status] || 999;
      const orderB = statusOrder[b.status] || 999;
     
      // 如果状态相同，按课程代码排序
      if (orderA === orderB) {
          return (a.course_code || '').localeCompare(b.course_code || '');
      }
     
      return orderA - orderB;
  });
 
  // 为每个课程创建表格行
  sortedCourses.forEach(course => {
      const row = createCourseRow(course);
      tableBody.appendChild(row);
  });
 
  console.log('课程信息显示完成，已按状态排序');
}


// 更新createCourseRow函数，添加状态CSS类
function createCourseRow(course) {
  const row = document.createElement('tr');
 
   // 添加原始课程代码属性，用于编辑时识别
   row.setAttribute('data-original-course-code', course.course_code);


  // 根据状态添加CSS类
  const statusClass = getStatusCSSClass(course.status);
  if (statusClass) {
      row.classList.add(statusClass);
  }
 
  // 格式状态显示
  const statusDisplay = getStatusText(course.status);
 
  // 格式化注册日期
  const enrollmentDate = formatEnrollmentDate(course.start_year, course.start_month, course.start_day);
 
  // 格式化完成日期
  const completionDate = course.completion_date || '';


   // 格式化 Local 和 Compulsory 显示
   const localDisplay = course.is_local === 1 ? 'Yes' : 'No';
   const compulsoryDisplay = course.is_compulsory === 1 ? 'Yes' : 'No';
 
  row.innerHTML = `
      <td>${course.course_code}</td>
      <td>${statusDisplay}</td>
      <td>${enrollmentDate}</td>
      <td>${completionDate}</td>
      <td>${localDisplay}</td>
      <td>${compulsoryDisplay}</td>
      <td>${course.midterm_grade || ''}</td>
      <td>${course.final_grade || ''}</td>
      <td>
          <button class="btn secondary small" onclick="viewMidtermReport('${course.course_code}')">
              <i class="fa fa-file-alt"></i> View
          </button>
      </td>
      <td>
          <button class="btn secondary small" onclick="viewFinalReport('${course.course_code}')">
              <i class="fa fa-file-alt"></i> View
          </button>
      </td>
      <td>
          <button class="btn danger small" onclick="deleteCourse('${course.course_code}')">
              <i class="fa fa-trash"></i> Delete
          </button>
      </td>
  `;
 
  return row;
}


// 根据状态获取CSS类名
function getStatusCSSClass(status) {
  const statusClassMap = {
      'IN_PROGRESS': 'status-in-progress',
      'COMPLETED': 'status-completed',
      'WITHDRAWN': 'status-withdrawn'
  };
  return statusClassMap[status] || null;
}


// 获取状态显示文本
function getStatusText(status) {
  const statusMap = {
      'IN_PROGRESS': 'Course In Progress',
      'COMPLETED': 'Course Completed',
      'WITHDRAWN': 'Course Withdrawn'
  };
  return statusMap[status] || status || 'Unknown Status';
}


// 格式化注册日期
function formatEnrollmentDate(year, month, day) {
  if (!year) return '';
 
  // 月份映射
  const monthMap = {
      'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
      'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
      'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
  };
 
  const formattedMonth = monthMap[month] || '01';
  const formattedDay = day ? day.toString().padStart(2, '0') : '01';
 
  return `${year}-${formattedMonth}-${formattedDay}`;
}


// 查看期中报告卡
function viewMidtermReport(courseCode) {
  const urlParams = new URLSearchParams(window.location.search);
  const oen = urlParams.get('oen');
  window.location.href = `midtermrc.html?oen=${oen}&course=${courseCode}`;
}


// 查看期末报告卡
function viewFinalReport(courseCode) {
  const urlParams = new URLSearchParams(window.location.search);
  const oen = urlParams.get('oen');
  window.location.href = `finalrc.html?oen=${oen}&course=${courseCode}`;
}


// 删除课程
async function deleteCourse(courseCode) {
  if (!confirm(`确定要删除课程 ${courseCode} 吗？此操作无法撤销。`)) {
      return;
  }
 
  const urlParams = new URLSearchParams(window.location.search);
  const oen = urlParams.get('oen');
 
  try {
      const response = await fetch(`/api/student/${oen}/course/${courseCode}`, {
          method: 'DELETE'
      });
     
      if (!response.ok) {
          throw new Error(`删除失败: ${response.status}`);
      }
     
      alert('课程删除成功');
      // 重新加载课程数据
      loadStudentCourses(oen);
     
  } catch (error) {
      console.error('删除课程失败:', error);
      alert(`删除课程失败: ${error.message}`);
  }
}


// -----处理其他课程的view mode结束


// 处理编辑PLAR信息
function initStudentAllCoursePage() {
  console.log('初始化学生课程页面');
   // 获取URL参数中的OEN
  const urlParams = new URLSearchParams(window.location.search);
  const oen = urlParams.get('oen');
   console.log('从URL获取的OEN:', oen);
   if (!oen) {
      console.error('未找到OEN参数');
      alert('错误：未找到学生OEN参数');
      return;
  }
   // 加载学生PLAR信息
  loadStudentPLAR(oen);
 
  // 加载学生课程数据
  loadStudentCourses(oen);
   // 更新页面标题显示学生姓名
  updateStudentNameTitle(oen);
 
  // 延迟设置事件监听器，确保DOM完全加载
  setTimeout(() => {
        console.log('设置编辑模式事件监听器');
        setupEditModeListeners();

        // 验证关键元素是否存在
        const editInfoBtn = document.getElementById('edit-info-btn');
        const editClassesBtn = document.getElementById('edit-classes-btn');
        const saveBtn = document.getElementById('save-changes-btn');
        const cancelBtn = document.getElementById('cancel-edit-btn');
        
        console.log('元素检查结果:');
        console.log('- Edit Info Button:', !!editInfoBtn);
        console.log('- Edit Classes Button:', !!editClassesBtn);
        console.log('- Save Button:', !!saveBtn);
        console.log('- Cancel Button:', !!cancelBtn);
        
        if (!editInfoBtn || !editClassesBtn || !saveBtn || !cancelBtn) {
            console.error('关键元素缺失，请检查HTML结构');
        }        
  }, 500);
}


// 设置编辑模式事件监听器
function setupEditModeListeners() {
   console.log('设置编辑模式事件监听器');
  
   try {
       // 获取所有按钮元素
       const editInfoBtn = document.getElementById('edit-info-btn');
       const saveChangesBtn = document.getElementById('save-changes-btn');
       const cancelEditBtn = document.getElementById('cancel-edit-btn');
       const editPlarInfo = document.getElementById('edit-plar-info');
       const editClassesBtn = document.getElementById('edit-classes-btn');
       const addCourseBtn = document.getElementById('add-course-btn');
      
       // PLAR 编辑按钮
       if (editInfoBtn) {
           console.log('找到PLAR编辑按钮，添加事件监听器');
           editInfoBtn.addEventListener('click', enterEditMode);
       } else {
           console.error('未找到PLAR编辑按钮元素');
       }
      
       // 课程编辑按钮
       if (editClassesBtn) {
           console.log('找到课程编辑按钮，添加事件监听器');
           editClassesBtn.addEventListener('click', enterCourseEditMode);
       } else {
           console.error('未找到课程编辑按钮元素');
       }
       // 添加课程按钮 - 添加这个部分
       if (addCourseBtn) {
           console.log('找到添加课程按钮，添加事件监听器');
           addCourseBtn.addEventListener('click', showAddCourseForm);
       } else {
           console.error('未找到添加课程按钮元素');
       }
      
       // 保存按钮
       if (saveChangesBtn) {
           console.log('找到保存按钮，添加事件监听器');
           saveChangesBtn.addEventListener('click', saveChanges);
       } else {
           console.error('未找到保存按钮元素');
       }
      
       // 取消按钮
       if (cancelEditBtn) {
           console.log('找到取消按钮，添加事件监听器');
           cancelEditBtn.addEventListener('click', cancelCurrentEdit);
       } else {
           console.error('未找到取消按钮元素');
       }
      
       // PLAR选择变化监听器
       if (editPlarInfo) {
           console.log('找到PLAR选择元素，添加事件监听器');
           editPlarInfo.addEventListener('change', handlePlarInfoChange);
       } else {
           console.error('未找到PLAR选择元素');
       }
      
       console.log('事件监听器设置完成');
   } catch (error) {
       console.error('设置事件监听器时出错:', error);
   }
}

function handlePlarInfoChange() {
    console.log('PLAR信息选择发生变化');
    
    const plarInfoSelect = document.getElementById('edit-plar-info');
    const plarEvaluatedSelect = document.getElementById('edit-plar-evaluated');
    const plarDateInput = document.getElementById('edit-plar-date');
    const plarTotalInput = document.getElementById('edit-plar-total');
    const plarCompulsoryInput = document.getElementById('edit-plar-compulsory');
    
    if (plarInfoSelect.value === 'No') {
        // 如果选择No，禁用其他字段并清空值
        plarEvaluatedSelect.disabled = true;
        plarDateInput.disabled = true;
        plarTotalInput.disabled = true;
        plarCompulsoryInput.disabled = true;
        
        plarEvaluatedSelect.value = 'No';
        plarDateInput.value = '';
        plarTotalInput.value = '';
        plarCompulsoryInput.value = '';
    } else {
        // 如果选择Yes，启用其他字段
        plarEvaluatedSelect.disabled = false;
        plarDateInput.disabled = false;
        plarTotalInput.disabled = false;
        plarCompulsoryInput.disabled = false;
    }
}

// 进入编辑模式
function enterEditMode() {
    console.log('进入编辑模式');
    
    currentEditMode = 'plar';

    // 隐藏查看模式，显示编辑模式
    const plarViewMode = document.getElementById('plar-view-mode');
    const plarEditMode = document.getElementById('plar-edit-mode');
    const viewModeControls = document.getElementById('view-mode-controls');
    const editControlsEdit = document.getElementById('edit-controls-edit');
    
    if (plarViewMode) plarViewMode.style.display = 'none';
    if (plarEditMode) plarEditMode.style.display = 'block';
    if (viewModeControls) viewModeControls.style.display = 'none';
    if (editControlsEdit) editControlsEdit.style.display = 'block';
    
    // 填充当前数据到编辑表单
    fillPLAREditForm();
}


// 填充编辑表单
function fillPLAREditForm() {
   const plarInfo = document.getElementById('plar-info').textContent;
   const plarEvaluated = document.getElementById('plar-evaluated').textContent;
   const plarDate = document.getElementById('plar-date').textContent;
   const plarTotal = document.getElementById('plar-total').textContent;
   const plarCompulsory = document.getElementById('plar-compulsory').textContent;
  
   document.getElementById('edit-plar-info').value = plarInfo;
   document.getElementById('edit-plar-evaluated').value = plarEvaluated;
  
   if (plarDate !== 'N/A') {
       document.getElementById('edit-plar-date').value = plarDate;
   }
  
   if (plarTotal !== 'N/A') {
       document.getElementById('edit-plar-total').value = plarTotal;
   }
  
   if (plarCompulsory !== 'N/A') {
       document.getElementById('edit-plar-compulsory').value = plarCompulsory;
   }
}


// 处理PLAR信息变化
function fillPLAREditForm() {
    console.log('填充PLAR编辑表单');
    
    // 获取当前显示的值
    const plarInfo = document.getElementById('plar-info').textContent.trim();
    const plarEvaluated = document.getElementById('plar-evaluated').textContent.trim();
    const plarDate = document.getElementById('plar-date').textContent.trim();
    const plarTotal = document.getElementById('plar-total').textContent.trim();
    const plarCompulsory = document.getElementById('plar-compulsory').textContent.trim();
    
    console.log('当前PLAR显示值:', { plarInfo, plarEvaluated, plarDate, plarTotal, plarCompulsory });
    
    // 设置"Does the student have PLAR?"
    const plarInfoSelect = document.getElementById('edit-plar-info');
    plarInfoSelect.value = plarInfo; // 直接使用显示值（Yes/No）
    
    // 设置"Is PLAR Evaluated at EVA?"
    const plarEvaluatedSelect = document.getElementById('edit-plar-evaluated');
    if (plarEvaluated === 'Yes' || plarEvaluated === 'No') {
        plarEvaluatedSelect.value = plarEvaluated;
    } else {
        plarEvaluatedSelect.value = 'No'; // N/A时默认为No
    }
    
    // 设置评估日期
    const plarDateInput = document.getElementById('edit-plar-date');
    if (plarDate !== 'N/A' && plarDate !== '') {
        // 验证日期格式
        if (plarDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            plarDateInput.value = plarDate;
        }
    }
    
    // 设置总学分
    const plarTotalInput = document.getElementById('edit-plar-total');
    if (plarTotal !== 'N/A' && plarTotal !== '') {
        plarTotalInput.value = plarTotal;
    }
    
    // 设置必修学分
    const plarCompulsoryInput = document.getElementById('edit-plar-compulsory');
    if (plarCompulsory !== 'N/A' && plarCompulsory !== '') {
        plarCompulsoryInput.value = plarCompulsory;
    }
    
    // 根据PLAR状态设置字段可用性
    handlePlarInfoChange();
}

// 保存更改
// 保存更改
async function saveChanges() {
    console.log('保存更改，当前编辑模式:', currentEditMode);
    
    const urlParams = new URLSearchParams(window.location.search);
    const oen = urlParams.get('oen');
    
    if (currentEditMode === 'courses') {
        await saveCourseChanges(oen);
    } else if (currentEditMode === 'plar') {
        // PLAR 保存逻辑
        const plarData = {
            hasPLAR: document.getElementById('edit-plar-info').value === 'Yes',
            isEvaluated: document.getElementById('edit-plar-evaluated').value,
            evaluationDate: document.getElementById('edit-plar-date').value,
            totalCredits: document.getElementById('edit-plar-total').value,
            compulsoryCredits: document.getElementById('edit-plar-compulsory').value
        };

        try {
            const response = await fetch(`/api/student/${oen}/plar`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(plarData)
            });
            
            if (!response.ok) {
                throw new Error(`保存失败: ${response.status}`);
            }
            
            alert('PLAR信息保存成功');
            exitEditMode();
            loadStudentPLAR(oen);
            
        } catch (error) {
            console.error('保存PLAR信息失败:', error);
            alert(`保存失败: ${error.message}`);
        }
    }
}


// 取消编辑
function cancelCurrentEdit() {
    console.log('取消编辑，当前模式:', currentEditMode);
    
    if (currentEditMode === 'courses') {
        exitCourseEditMode();
    } else if (currentEditMode === 'plar') {
        exitEditMode();
    }
}


// 退出编辑模式
function exitEditMode() {

       // 重置编辑状态
    currentEditMode = null;

   document.getElementById('plar-view-mode').style.display = 'block';
   document.getElementById('plar-edit-mode').style.display = 'none';
   document.getElementById('view-mode-controls').style.display = 'flex';
   document.getElementById('edit-controls-edit').style.display = 'none';
  
   // 重置表单字段的disabled状态
   document.getElementById('edit-plar-evaluated').disabled = false;
   document.getElementById('edit-plar-date').disabled = false;
   document.getElementById('edit-plar-total').disabled = false;
   document.getElementById('edit-plar-compulsory').disabled = false;
}






// 修复updateStudentNameTitle函数
async function updateStudentNameTitle(oen) {
   console.log('更新学生姓名标题:', oen);
   try {
       const response = await fetch(`/api/student/${oen}`);
       if (response.ok) {
           const student = await response.json();
           const titleElement = document.getElementById('student-name-title');
           if (titleElement) {
               titleElement.textContent = `${student.firstName} ${student.lastName} - All Courses`;
               console.log('标题更新成功');
           } else {
               console.error('未找到标题元素');
           }
       } else {
           console.error('获取学生信息失败:', response.status);
       }
   } catch (error) {
       console.error('获取学生姓名失败:', error);
       // 如果获取失败，显示默认标题
       const titleElement = document.getElementById('student-name-title');
       if (titleElement) {
           titleElement.textContent = 'Student All Courses';
       }
   }
}


// -----处理编辑PLAR信息结束


//编辑课程开始
// 新增：进入课程编辑模式
function enterCourseEditMode() {
    console.log('进入课程编辑模式');

    currentEditMode = 'courses';
    
    // 获取所有课程行
    const courseRows = document.querySelectorAll('#course-table-body tr');
    console.log(`找到 ${courseRows.length} 行课程数据`);
    
    if (courseRows.length === 0) {
        console.error('没有找到课程行');
        alert('没有找到课程数据');
        return;
    }
    
    courseRows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        console.log(`处理第 ${index + 1} 行，包含 ${cells.length} 个单元格`);
        
        if (cells.length < 11) {
            console.warn(`第 ${index + 1} 行单元格数量不足: ${cells.length}`);
            return;
        }
        
        // 保存原始数据
        const originalData = {
            courseCode: cells[0].textContent.trim(),
            status: cells[1].textContent.trim(),
            enrollmentDate: cells[2].textContent.trim(),
            completionDate: cells[3].textContent.trim(),
            local: cells[4].textContent.trim(),
            compulsory: cells[5].textContent.trim(),
            midtermGrade: cells[6].textContent.trim(),
            finalGrade: cells[7].textContent.trim()
        };
        
        console.log(`第 ${index + 1} 行原始数据:`, originalData);
        
        // 将每个单元格转换为编辑模式
        convertCellToEdit(cells[0], 'text', originalData.courseCode); // Course Code
        convertCellToEdit(cells[1], 'select', originalData.status, ['Course In Progress', 'Course Completed', 'Course Withdrawn']); // Status
        convertCellToEdit(cells[2], 'date', originalData.enrollmentDate); // Enrollment Date
        convertCellToEdit(cells[3], 'date', originalData.completionDate); // Completion Date
        convertCellToEdit(cells[4], 'select', originalData.local, ['Yes', 'No']); // Local
        convertCellToEdit(cells[5], 'select', originalData.compulsory, ['Yes', 'No']); // Compulsory
        convertCellToEdit(cells[6], 'text', originalData.midtermGrade); // Midterm Grade
        convertCellToEdit(cells[7], 'text', originalData.finalGrade); // Final Grade
        
        // 隐藏报告卡和删除按钮列
        cells[8].style.display = 'none'; // Midterm Report Card
        cells[9].style.display = 'none'; // Final Report Card
        cells[10].style.display = 'none'; // Action
    });
    
    // 切换控制按钮
    const viewModeControls = document.getElementById('view-mode-controls');
    const editControlsEdit = document.getElementById('edit-controls-edit');
    const addCourseSection = document.querySelector('.add-course-section');
    
    if (viewModeControls) {
        viewModeControls.style.display = 'none';
        console.log('隐藏了查看模式控件');
    }
    if (editControlsEdit) {
        editControlsEdit.style.display = 'block';
        console.log('显示了编辑模式控件');
    }
    if (addCourseSection) {
        addCourseSection.style.display = 'none';
        console.log('隐藏了添加课程按钮');
    }
    
    console.log('课程编辑模式初始化完成');
}


// 新增：将单元格转换为编辑控件
function convertCellToEdit(cell, type, currentValue, options = null) {
   let input;
  
   switch (type) {
       case 'text':
           input = document.createElement('input');
           input.type = 'text';
           input.value = currentValue || '';
           input.style.width = '100%';
           input.style.padding = '4px';
           break;
          
       case 'date':
           input = document.createElement('input');
           input.type = 'date';
           if (currentValue && currentValue !== 'N/A') {
               input.value = currentValue;
           }
           input.style.width = '100%';
           input.style.padding = '4px';
           break;
          
       case 'select':
           input = document.createElement('select');
           input.style.width = '100%';
           input.style.padding = '4px';
          
           options.forEach(option => {
               const optionElement = document.createElement('option');
               optionElement.value = option;
               optionElement.textContent = option;
               if (option === currentValue) {
                   optionElement.selected = true;
               }
               input.appendChild(optionElement);
           });
           break;
   }
  
   // 替换单元格内容
   cell.innerHTML = '';
   cell.appendChild(input);
}


// 新增：保存课程更改
async function saveCourseChanges(oen) {
   console.log('保存课程更改');
  
   const courseRows = document.querySelectorAll('#course-table-body tr');
   const courseUpdates = [];
  
   courseRows.forEach((row, index) => {
       const cells = row.querySelectorAll('td');
       if (cells.length < 8) return;
      
       const inputs = row.querySelectorAll('input, select');
       if (inputs.length < 8) return;
      
       const courseData = {
           originalCourseCode: row.getAttribute('data-original-course-code') || inputs[0].value, // 需要在进入编辑模式时设置
           courseCode: inputs[0].value,
           status: inputs[1].value,
           enrollmentDate: inputs[2].value,
           completionDate: inputs[3].value,
           local: inputs[4].value,
           compulsory: inputs[5].value,
           midtermGrade: inputs[6].value,
           finalGrade: inputs[7].value
       };
      
       courseUpdates.push(courseData);
   });
  
   try {
       const response = await fetch(`/api/student/${oen}/courses`, {
           method: 'PUT',
           headers: {
               'Content-Type': 'application/json'
           },
           body: JSON.stringify({ courses: courseUpdates })
       });
      
       if (!response.ok) {
           throw new Error(`保存失败: ${response.status}`);
       }
      
       alert('课程信息保存成功');
      
       // 退出编辑模式并重新加载数据
       exitCourseEditMode();
       loadStudentCourses(oen);
      
   } catch (error) {
       console.error('保存课程信息失败:', error);
       alert(`保存失败: ${error.message}`);
   }
}
function exitCourseEditMode() {
   console.log('退出课程编辑模式');

   currentEditMode = null;

  
   // 重新加载课程数据以恢复原始显示
   const urlParams = new URLSearchParams(window.location.search);
   const oen = urlParams.get('oen');
   loadStudentCourses(oen);
  
   // 恢复控制按钮
   document.getElementById('view-mode-controls').style.display = 'flex';
   document.getElementById('edit-controls-edit').style.display = 'none';
  
   // 显示添加课程按钮
   document.querySelector('.add-course-section').style.display = 'block';
}


//编辑课程结束


// 添加新的课程开始
// 新增：显示添加课程表单
function showAddCourseForm() {
   console.log('显示添加课程表单');
  
   const container = document.getElementById('manual-course-container');
   const tableHead = document.getElementById('manual-course-head');
   const tableBody = document.getElementById('manual-course-body');
  
   // 创建表头（如果不存在）
   if (tableHead.children.length === 0) {
       tableHead.innerHTML = `
           <tr>
               <th>Course Code</th>
               <th>Status</th>
               <th>Enrollment Date</th>
               <th>Completion Date</th>
               <th>Local</th>
               <th>Compulsory</th>
               <th>Midterm Grade</th>
               <th>Final Grade</th>
               <th>Action</th>
           </tr>
       `;
   }
  
   // 创建新的课程行
   const newRow = createNewCourseRow();
   tableBody.appendChild(newRow);
  
   // 显示容器
   container.style.display = 'block';
  
   // 滚动到新添加的行
   newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
}


// 新增：创建新课程行
function createNewCourseRow() {
   const row = document.createElement('tr');
   row.className = 'new-course-row';
  
   row.innerHTML = `
       <td>
           <input type="text" class="form-control" placeholder="Enter course code" required>
       </td>
       <td>
           <select class="form-control" required>
               <option value="">Select Status</option>
               <option value="Course In Progress">Course In Progress</option>
               <option value="Course Completed">Course Completed</option>
               <option value="Course Withdrawn">Course Withdrawn</option>
           </select>
       </td>
       <td>
           <input type="date" class="form-control" required>
       </td>
       <td>
           <input type="date" class="form-control">
       </td>
       <td>
           <select class="form-control" required>
               <option value="">Select</option>
               <option value="Yes">Yes</option>
               <option value="No">No</option>
           </select>
       </td>
       <td>
           <select class="form-control" required>
               <option value="">Select</option>
               <option value="Yes">Yes</option>
               <option value="No">No</option>
           </select>
       </td>
       <td>
           <input type="text" class="form-control" placeholder="Grade">
       </td>
       <td>
           <input type="text" class="form-control" placeholder="Grade">
       </td>
       <td>
           <button type="button" class="btn btn-success btn-sm" onclick="saveNewCourse(this)">
               <i class="fa fa-save"></i> Save
           </button>
           <button type="button" class="btn btn-secondary btn-sm" onclick="cancelNewCourse(this)">
               <i class="fa fa-times"></i> Cancel
           </button>
       </td>
   `;
  
   return row;
}


// 新增：保存新课程
async function saveNewCourse(button) {
   const row = button.closest('tr');
   const inputs = row.querySelectorAll('input, select');
  
   // 验证必填字段
   const courseCode = inputs[0].value.trim();
   const status = inputs[1].value;
   const enrollmentDate = inputs[2].value;
   const local = inputs[4].value;
   const compulsory = inputs[5].value;
  
   if (!courseCode || !status || !enrollmentDate || !local || !compulsory) {
       alert('请填写所有必填字段（课程代码、状态、注册日期、Local、Compulsory）');
       return;
   }
  
   // 收集课程数据
   const courseData = {
       courseCode: courseCode,
       status: status,
       enrollmentDate: enrollmentDate,
       completionDate: inputs[3].value || null,
       local: local,
       compulsory: compulsory,
       midtermGrade: inputs[6].value.trim() || null,
       finalGrade: inputs[7].value.trim() || null
   };
  
   console.log('保存新课程数据:', courseData);
  
   // 获取学生OEN
   const urlParams = new URLSearchParams(window.location.search);
   const oen = urlParams.get('oen');
  
   try {
       // 显示保存状态
       button.disabled = true;
       button.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';
      
       const response = await fetch(`/api/student/${oen}/course`, {
           method: 'POST',
           headers: {
               'Content-Type': 'application/json'
           },
           body: JSON.stringify(courseData)
       });
      
       if (!response.ok) {
           const errorData = await response.json();
           throw new Error(errorData.error || `HTTP错误: ${response.status}`);
       }
      
       const result = await response.json();
       console.log('保存成功:', result);
      
       alert('课程添加成功！');
      
       // 移除新添加的行
       row.remove();
      
       // 如果没有其他新课程行，隐藏容器
       const remainingRows = document.querySelectorAll('.new-course-row');
       if (remainingRows.length === 0) {
           document.getElementById('manual-course-container').style.display = 'none';
       }
      
       // 重新加载课程数据以显示新添加的课程
       loadStudentCourses(oen);
      
   } catch (error) {
       console.error('保存课程失败:', error);
       alert(`课程添加失败: ${error.message}`);
      
       // 恢复按钮状态
       button.disabled = false;
       button.innerHTML = '<i class="fa fa-save"></i> Save';
   }
}


// 新增：取消新课程
function cancelNewCourse(button) {
   const row = button.closest('tr');
  
   if (confirm('确定要取消添加这门课程吗？')) {
       row.remove();
      
       // 如果没有其他新课程行，隐藏容器
       const remainingRows = document.querySelectorAll('.new-course-row');
       if (remainingRows.length === 0) {
           document.getElementById('manual-course-container').style.display = 'none';
       }
    }
}  
//添加新的课程结束
// ========================================
// studentallcourse.html 相关功能结束
// ========================================




// ========================================
// student final ost相关功能
// ========================================
//填充pdf
document.addEventListener('DOMContentLoaded', function () {
  // 处理Final OST链接
  const finalLink = document.getElementById('final-ost-link');
  if (finalLink) {
    finalLink.addEventListener('click', function (e) {
      e.preventDefault();

      const oenElement = document.getElementById('oen');
      if (!oenElement) {
        alert('OEN not found.');
        return;
      }

      let oen = oenElement.innerText.trim();
      oen = oen.replace(/\D/g, '');

      if (oen && oen.length > 0) {
        const url = `http://localhost:3000/generate-pdf/${oen}`;
        console.log('Attempting to access Final OST:', url);
        window.open(url, '_blank');
      } else {
        alert('Invalid OEN format.');
      }
    });
  }
  // ========================================
  // student final ost 相关功能结束
  // ========================================


  // ========================================
  // student ost相关功能
  // ========================================
  const ostLink = document.getElementById('view-ost-link');
  if (ostLink) {
    ostLink.addEventListener('click', function (e) {
      e.preventDefault();

      const oenElement = document.getElementById('oen');
      if (!oenElement) {
        alert('OEN not found.');
        return;
      }

      let oen = oenElement.innerText.trim();
      oen = oen.replace(/\D/g, '');

      if (oen && oen.length > 0) {
        const url = `http://localhost:3000/generate-ost-pdf/${oen}`;
        console.log('Attempting to access OST:', url);
        window.open(url, '_blank');
      } else {
        alert('Invalid OEN format.');
      }
    });
  }
  // ========================================
  // student ost 相关功能结束
  // ========================================


  // ========================================
  // student EVA_OST_26 相关功能
  // ========================================
  const ost26Link = document.getElementById('view-ost26-link');
  if (ost26Link) {
    ost26Link.addEventListener('click', function (e) {
      e.preventDefault();

      const oenElement = document.getElementById('oen');
      if (!oenElement) {
        alert('OEN not found.');
        return;
      }

      let oen = oenElement.innerText.trim();
      oen = oen.replace(/\D/g, '');

      if (oen && oen.length > 0) {
        const url = `http://localhost:3000/generate-ost26-pdf/${oen}`;
        console.log('Attempting to access EVA_OST_26:', url);
        window.open(url, '_blank');
      } else {
        alert('Invalid OEN format.');
      }
    });
  }
  // ========================================
  // student EVA_OST_26 相关功能结束
  // ========================================

    // ========================================
  // student EVA_FINAL_OST_26 相关功能
  // ========================================
  const finalOst26Link = document.getElementById('view-final-ost26-link');
  if (finalOst26Link) {
    finalOst26Link.addEventListener('click', function (e) {
      e.preventDefault();

      const oenElement = document.getElementById('oen');
      if (!oenElement) {
        alert('OEN not found.');
        return;
      }

      let oen = oenElement.innerText.trim();
      oen = oen.replace(/\D/g, '');

      if (oen && oen.length > 0) {
        const url = `http://localhost:3000/generate-final-ost26-pdf/${oen}`;
        console.log('Attempting to access EVA_FINAL_OST_26:', url);
        window.open(url, '_blank');
      } else {
        alert('Invalid OEN format.');
      }
    });
  }
  // ========================================
  // student EVA_FINAL_OST_26 相关功能结束
  // ========================================
  
});


// ========================================
// studentdetail.html 相关功能
// ========================================


// studentdetail.html 获取学生在读状态
function getStatusDisplayText(status) {
    switch (status) {
        case 'IN_PROGRESS':
            return 'Currently Enrolled';
        case 'GRADUATED':
            return 'Student Already Graduated';
        case 'WITHDRAWN':
            return 'Student Has Already Withdrawn from EVA';
        default:
            return status || 'N/A';
    }
}

function initStudentDetailPage() {
    console.log('初始化学生详情页面');
    
    // 获取URL参数中的OEN
    const urlParams = new URLSearchParams(window.location.search);
    const oen = urlParams.get('oen');
    
    console.log('从URL获取的OEN:', oen);
    
    if (!oen) {
        console.error('未找到OEN参数');
        alert('错误：未找到学生OEN参数');
        return;
    }
    
    // 设置相关链接
    setupLinks(oen);
    
    // 加载学生详情
    loadStudentDetail(oen);
    
    // 绑定事件监听器
    setupEventListeners(oen);
    
    // 设置搜索功能
    setupDetailPageSearch();
}

// 设置相关链接
function setupLinks(oen) {
    const viewCoursesLink = document.getElementById('view-all-courses-link');
    const ostLink = document.getElementById('view-ost-link');
    const finalOstLink = document.getElementById('final-ost-link');
    
    const manageFileLink = document.getElementById('manage-file-link');

    if (viewCoursesLink) {
        viewCoursesLink.href = `studentallcourse.html?oen=${oen}`;
    }
    
    if (ostLink) {
        ostLink.href = `ost.html?oen=${oen}`;
    }
    
    if (finalOstLink) {
        finalOstLink.href = `ost-final.html?oen=${oen}`;
    }
    
    if (manageFileLink) {
        manageFileLink.href = `studentfile.html?oen=${oen}`;
        console.log('文件管理链接设置为:', `studentfile.html?oen=${oen}`);
    }
    
    console.log('相关链接设置完成');
}

// 加载学生详情数据
async function loadStudentDetail(oen) {
    console.log('开始加载学生详情，OEN:', oen);
    
    try {
        const response = await fetch(`/api/student/${oen}/detail`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('未找到该学生信息');
            }
            throw new Error(`HTTP错误: ${response.status}`);
        }
        
        const student = await response.json();
        console.log('成功获取学生数据:', student);
        
        // 显示学生信息
        displayStudentInfo(student);
        
        // 填充编辑表单
        fillEditForm(student);
        
    } catch (error) {
        console.error('加载学生详情失败:', error);
        alert(`加载学生信息失败: ${error.message}`);
        
        // 显示错误信息
        const fullnameEl = document.getElementById('student-fullname');
        if (fullnameEl) fullnameEl.textContent = '加载失败';
        
        document.querySelectorAll('#view-mode span').forEach(span => {
            if (span.textContent === 'Loading...') {
                span.textContent = '加载失败';
            }
        });
    }
}

// 显示学生信息
function displayStudentInfo(student) {
    console.log('显示学生信息:', student);
    
    // 基本信息
    const elements = {
        'student-fullname': `${student.firstName} ${student.lastName}`,
        'first-name': student.firstName,
        'last-name': student.lastName,
        'oen': student.oen,
        'student-number': student.studentNumber || 'N/A',
        'status': getStatusDisplayText(student.status),
        'grade': student.grade || 'N/A',
        'dob': formatDisplayDate(student.dateOfBirth),
        'enroll-date': formatDisplayDate(student.enrollmentDate),
        'grad-date': formatDisplayDate(student.graduationDate),
        'volunteer': student.volunteerHours || '0',
        'address': student.address || 'N/A',
        'remark': student.remark || 'N/A' 
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }
    
    console.log('学生信息显示完成');
}

// 填充编辑表单
function fillEditForm(student) {
    console.log('填充编辑表单');
    
    const formFields = {
        'edit-first-name': student.firstName,
        'edit-last-name': student.lastName,
        'edit-oen': student.oen,
        'edit-student-number': student.studentNumber || '', 
        'edit-status': student.status,
        'edit-grade': student.grade || '',
        'edit-dob': student.dateOfBirth,
        'edit-enrollment': student.enrollmentDate,
        'edit-graduation': student.graduationDate,
        'edit-volunteer': student.volunteerHours || '',
        'edit-address': student.address || '',
        'edit-remark': student.remark || ''
    };
    
    for (const [id, value] of Object.entries(formFields)) {
        const element = document.getElementById(id);
        if (element) element.value = value;
    }
    
    console.log('编辑表单填充完成');
}

// 设置事件监听器
function setupEventListeners(oen) {
    console.log('设置事件监听器');
    
    // 编辑按钮
    const editButton = document.getElementById('edit-button');
    if (editButton) {
        editButton.addEventListener('click', function() {
            console.log('点击编辑按钮');
            showEditMode();
        });
    }
    
    // 取消编辑按钮
    const cancelEditButton = document.getElementById('cancel-edit');
    if (cancelEditButton) {
        cancelEditButton.addEventListener('click', function() {
            console.log('点击取消编辑按钮');
            showViewMode();
        });
    }
    
    // 编辑表单提交
    const editForm = document.getElementById('edit-student-form');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('提交编辑表单');
            submitEditForm(oen);
        });
    }
    
    // 删除按钮
    const deleteButton = document.getElementById('delete-button');
    if (deleteButton) {
        deleteButton.addEventListener('click', function() {
            console.log('点击删除按钮');
            deleteStudent(oen);
        });
    }
    
    console.log('事件监听器设置完成');
}

// 显示编辑模式
function showEditMode() {
    console.log('切换到编辑模式');
    const viewMode = document.getElementById('view-mode');
    const editMode = document.getElementById('edit-mode');
    if (viewMode) viewMode.style.display = 'none';
    if (editMode) editMode.style.display = 'block';
}

// 显示查看模式
function showViewMode() {
    console.log('切换到查看模式');
    const viewMode = document.getElementById('view-mode');
    const editMode = document.getElementById('edit-mode');
    if (viewMode) viewMode.style.display = 'block';
    if (editMode) editMode.style.display = 'none';
}

// 提交编辑表单
async function submitEditForm(oen) {
    console.log('提交学生信息编辑');
    
    const form = document.getElementById('edit-student-form');
    const formData = new FormData(form);
    
    // 构造更新数据
    const updateData = {
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        graduation_status: formData.get('graduation_status'),
        grade: formData.get('grade'),
        dob: formData.get('dob'),
        enrollment_date: formData.get('enrollment_date'),
        expected_graduation_date: formData.get('expected_graduation_date'),
        volunteer_hours: formData.get('volunteer_hours'),
        address: formData.get('address'),
        student_number: formData.get('student_number'),  // 新增
        remark: formData.get('remark')  // 新增
    };
    
    console.log('要更新的数据:', updateData);
    
    try {
        const response = await fetch(`/api/student/${oen}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('更新成功:', result);
        
        alert('学生信息更新成功！');
        
        // 重新加载学生数据
        await loadStudentDetail(oen);
        
        // 切换回查看模式
        showViewMode();
        
    } catch (error) {
        console.error('更新学生信息失败:', error);
        alert(`更新失败: ${error.message}`);
    }
}

// 删除学生
async function deleteStudent(oen) {
    console.log('准备删除学生，OEN:', oen);
    
    // 确认删除
    if (!confirm('确定要删除这个学生吗？此操作无法撤销！')) {
        console.log('用户取消删除操作');
        return;
    }
    
    try {
        const response = await fetch(`/api/student/${oen}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('删除成功:', result);
        
        alert('学生已成功删除！');
        
        // 跳转回学生列表页面
        window.location.href = 'studentmain.html';
        
    } catch (error) {
        console.error('删除学生失败:', error);
        alert(`删除失败: ${error.message}`);
    }
}

// 设置详情页面搜索功能
function setupDetailPageSearch() {
    console.log('设置详情页面搜索功能');
    
    const searchInput = document.getElementById('student-search');
    if (!searchInput) {
        console.log('未找到搜索输入框');
        return;
    }
    
    // 添加搜索事件监听器
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.trim();
        console.log('搜索输入:', searchTerm);
        
        if (searchTerm.length > 0) {
            performDetailPageSearch(searchTerm);
        }
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const searchTerm = this.value.trim();
            if (searchTerm.length > 0) {
                performDetailPageSearch(searchTerm);
            }
        }
    });
}

// 执行详情页面搜索
async function performDetailPageSearch(searchTerm) {
    console.log('执行详情页面搜索:', searchTerm);
    
    try {
        const response = await fetch(`/api/students/search?q=${encodeURIComponent(searchTerm)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        
        const results = await response.json();
        console.log('搜索结果:', results);
        
        // 如果找到结果，可以显示搜索建议或跳转
        if (results.length > 0) {
            showDetailPageSearchResults(results);
        }
        
    } catch (error) {
        console.error('搜索失败:', error);
    }
}

// 显示详情页面搜索结果 (可选功能)
function showDetailPageSearchResults(results) {
    // 这里可以实现搜索结果的下拉显示
    // 暂时只在控制台输出
    console.log('详情页面搜索到的学生:', results);
}

// ========================================
// studentdetail.html 相关功能结束
// ========================================

// ========================================
// studentmain.html 相关功能
// ========================================

function initStudentMainPage() {
    console.log('初始化学生列表页面');
    
    // 初始化全局变量
    window.allStudents = [];
    window.filteredStudents = [];
    window.currentSortColumn = null;
    window.sortDirection = 'asc';
    
    loadStudents();
    setupMainPageSearch();
    setupSorting();
}

// 加载所有学生数据
async function loadStudents() {
    try {
        showLoadingState();
        
        const response = await fetch('/api/students');
        if (!response.ok) {
            throw new Error('获取学生数据失败');
        }
        
        const students = await response.json();
        window.allStudents = students;
        window.filteredStudents = [...students]; // 初始化过滤数据
        displayStudents(students);
        
        console.log(`成功加载 ${students.length} 条学生记录`);
        
    } catch (error) {
        console.error('加载学生数据时出错：', error);
        showErrorState(error.message);
    }
}

// 显示学生数据
function displayStudents(students) {
    const studentTableBody = document.getElementById('student-table-body');
    if (!studentTableBody) {
        console.error('找不到学生表格元素');
        return;
    }

    // 清空表格
    studentTableBody.innerHTML = '';

    if (students.length === 0) {
        showEmptyState();
        return;
    }

    // 填充学生数据
    students.forEach((student, index) => {
        const row = document.createElement('tr');
        
        // 添加悬停效果的类
        row.style.cursor = 'pointer';
        row.addEventListener('mouseenter', () => {
            row.style.backgroundColor = '#f8f9fa';
        });
        row.addEventListener('mouseleave', () => {
            row.style.backgroundColor = '';
        });
        
        // 核心功能：为行添加点击事件监听器，跳转到学生详情页面
        row.addEventListener('click', function() {
            const oen = student.oen;
            if (oen) {
                // 移除OEN中的连字符，确保URL参数格式一致
                const cleanOEN = oen.replace(/-/g, '');
                console.log(`点击学生行，OEN: ${oen}, 清理后: ${cleanOEN}`);
                // 跳转到学生详情页面，传递OEN参数
                window.location.href = `studentdetail.html?oen=${cleanOEN}`;
            } else {
                console.error('学生OEN为空，无法跳转');
                alert('该学生缺少OEN信息，无法查看详情');
            }
        });
        
        row.innerHTML = `
            <td>${student.studentName || 'N/A'}</td>
            <td>${student.oen || 'N/A'}</td>
            <td>${student.dateOfBirth || 'N/A'}</td>
            <td>${student.enrollmentDate || 'N/A'}</td>
            <td>${student.graduationDate || 'N/A'}</td>
        `;
        studentTableBody.appendChild(row);
    });
    
    console.log(`显示了 ${students.length} 条学生记录，已添加点击跳转功能`);
}

// 设置主页面搜索功能
function setupMainPageSearch() {
    const searchInput = document.getElementById('student-search');
    if (!searchInput) {
        console.error('找不到搜索输入框');
        return;
    }

    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        // 清除之前的定时器，实现防抖
        clearTimeout(searchTimeout);
        
        searchTimeout = setTimeout(() => {
            const searchTerm = this.value.trim();
            performMainPageSearch(searchTerm);
        }, 300); // 300ms 防抖延迟
    });

    // 添加回车键搜索
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const searchTerm = this.value.trim();
            performMainPageSearch(searchTerm);
        }
    });
}

// 设置排序功能
function setupSorting() {
    const table = document.querySelector('.student-table');
    if (!table) return;

    // 为可排序的列头添加点击事件和样式
    const sortableColumns = [
        { index: 0, key: 'studentName', text: 'Student Name' },
        { index: 3, key: 'enrollmentDate', text: 'Enrollment Date' },
        { index: 4, key: 'graduationDate', text: 'Graduation Date' }
    ];

    sortableColumns.forEach(column => {
        const th = table.querySelectorAll('th')[column.index];
        if (th) {
            th.style.cursor = 'pointer';
            th.style.userSelect = 'none';
            th.style.position = 'relative';
            th.style.paddingRight = '25px';
            
            // 添加悬停效果
            th.addEventListener('mouseenter', () => {
                th.style.backgroundColor = '#e9ecef';
            });
            th.addEventListener('mouseleave', () => {
                th.style.backgroundColor = '';
            });
            
            th.innerHTML = `${column.text} <i class="fa fa-sort" style="margin-left: 5px; opacity: 0.5; position: absolute; right: 8px; top: 50%; transform: translateY(-50%);"></i>`;
            
            th.addEventListener('click', () => {
                sortStudents(column.key);
                updateSortIndicators(column.index);
            });
        }
    });
}

// 更新排序指示器
function updateSortIndicators(activeColumnIndex) {
    const ths = document.querySelectorAll('.student-table th');
    const sortableIndexes = [0, 3, 4]; // Student Name, Enrollment Date, Graduation Date
    
    sortableIndexes.forEach((index) => {
        const th = ths[index];
        if (!th) return;
        
        const icon = th.querySelector('i');
        if (!icon) return;
        
        if (index === activeColumnIndex) {
            icon.className = window.sortDirection === 'asc' ? 'fa fa-sort-up' : 'fa fa-sort-down';
            icon.style.opacity = '1';
            icon.style.color = '#007bff';
        } else {
            icon.className = 'fa fa-sort';
            icon.style.opacity = '0.5';
            icon.style.color = '';
        }
    });
}

// 排序学生数据
function sortStudents(column) {
    // 如果点击的是同一列，切换排序方向
    if (window.currentSortColumn === column) {
        window.sortDirection = window.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        window.sortDirection = 'asc';
        window.currentSortColumn = column;
    }

    // 对当前过滤的数据进行排序
    const sortedStudents = [...window.filteredStudents].sort((a, b) => {
        let valueA, valueB;

        switch (column) {
            case 'studentName':
                // 按姓名首字母排序，不区分大小写
                valueA = (a.studentName || '').toLowerCase().trim();
                valueB = (b.studentName || '').toLowerCase().trim();
                break;
            case 'enrollmentDate':
            case 'graduationDate':
                // 将日期字符串转换为Date对象进行比较
                // 处理空值，将其视为最小日期
                valueA = a[column] ? new Date(a[column]) : new Date('1900-01-01');
                valueB = b[column] ? new Date(b[column]) : new Date('1900-01-01');
                
                // 检查日期是否有效
                if (isNaN(valueA.getTime())) valueA = new Date('1900-01-01');
                if (isNaN(valueB.getTime())) valueB = new Date('1900-01-01');
                break;
            default:
                return 0;
        }

        let result;
        if (column === 'studentName') {
            result = valueA.localeCompare(valueB);
        } else {
            result = valueA.getTime() - valueB.getTime();
        }

        return window.sortDirection === 'desc' ? -result : result;
    });

    displayStudents(sortedStudents);
    
    console.log(`按 ${column} ${window.sortDirection === 'asc' ? '升序' : '降序'} 排序了 ${sortedStudents.length} 条记录`);
}

// 执行主页面搜索
async function performMainPageSearch(searchTerm) {
    try {
        if (searchTerm === '') {
            // 如果搜索框为空，显示所有学生
            window.filteredStudents = [...window.allStudents];
            displayStudents(window.allStudents);
            console.log('显示所有学生记录');
            return;
        }

        // 显示加载状态
        showLoadingState();
        
        // 使用服务器端搜索获得更准确的结果
        const response = await fetch(`/api/students/search?q=${encodeURIComponent(searchTerm)}`);
        if (!response.ok) {
            throw new Error('搜索失败');
        }
        
        const searchResults = await response.json();
        window.filteredStudents = searchResults; // 更新过滤的学生数据
        
        // 如果当前有排序，应用排序
        if (window.currentSortColumn) {
            sortStudents(window.currentSortColumn);
        } else {
            displayStudents(searchResults);
        }
        
        console.log(`搜索 "${searchTerm}" 找到 ${searchResults.length} 条记录`);
        
    } catch (error) {
        console.error('搜索时出错：', error);
        showErrorState('搜索失败，请稍后重试');
    }
}

// 显示加载状态
function showLoadingState() {
    const studentTableBody = document.getElementById('student-table-body');
    if (studentTableBody) {
        studentTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #6c757d;">
                    <i class="fa fa-spinner fa-spin" style="font-size: 20px; margin-right: 10px;"></i>
                    正在加载学生数据...
                </td>
            </tr>
        `;
    }
}

// 显示空状态
function showEmptyState() {
    const searchInput = document.getElementById('student-search');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    const message = searchTerm 
        ? `没有找到与 "${searchTerm}" 匹配的学生记录` 
        : '没有学生记录';
        
    const studentTableBody = document.getElementById('student-table-body');
    if (studentTableBody) {
        studentTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #6c757d;">
                    <i class="fa fa-users" style="font-size: 24px; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
                    ${message}
                    ${searchTerm ? '<br><small>尝试使用不同的搜索关键词</small>' : ''}
                </td>
            </tr>
        `;
    }
}

// 显示错误状态
function showErrorState(errorMessage) {
    const studentTableBody = document.getElementById('student-table-body');
    if (studentTableBody) {
        studentTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #dc3545;">
                    <i class="fa fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                    <strong>${errorMessage}</strong>
                    <br>
                    <small>请检查网络连接或稍后重试</small>
                    <br>
                    <button onclick="loadStudents()" style="margin-top: 10px; padding: 5px 15px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">
                        <i class="fa fa-refresh"></i> 重新加载
                    </button>
                </td>
            </tr>
        `;
    }
}



// ========================================
// studentmain.html 相关功能结束
// ========================================







// ========================================
// addstudent.html 相关功能
// ========================================


// 验证表单数据
function validateStudentForm(formData) {
  const errors = [];
  
  // 检查必填字段
  if (!formData.firstName.trim()) errors.push('First Name is required');
  if (!formData.lastName.trim()) errors.push('Last Name is required');
  if (!formData.oen.trim()) errors.push('OEN is required');
  if (!formData.dobYear.trim()) errors.push('Birth Year is required');
  if (!formData.dobMonth.trim()) errors.push('Birth Month is required');
  if (!formData.dobDate.trim()) errors.push('Birth Date is required');
  if (!formData.enrollYear.trim()) errors.push('Enrollment Year is required');
  if (!formData.enrollMonth.trim()) errors.push('Enrollment Month is required');
  if (!formData.enrollDate.trim()) errors.push('Enrollment Date is required');
  if (!formData.gradYear.trim()) errors.push('Graduation Year is required');
  if (!formData.gradMonth.trim()) errors.push('Graduation Month is required');
  if (!formData.gradDate.trim()) errors.push('Graduation Date is required');
  
  // 验证 OEN 格式（应该是9位数字）
  const oenPattern = /^\d{9}$/;
  if (formData.oen && !oenPattern.test(formData.oen.replace(/[-\s]/g, ''))) {
    errors.push('OEN must be 9 digits');
  }
  
  // 验证年份格式
  const currentYear = new Date().getFullYear();
  if (formData.dobYear && (isNaN(formData.dobYear) || formData.dobYear < 1900 || formData.dobYear > currentYear)) {
    errors.push('Invalid birth year');
  }
  if (formData.enrollYear && (isNaN(formData.enrollYear) || formData.enrollYear < 2000 || formData.enrollYear > currentYear + 10)) {
    errors.push('Invalid enrollment year');
  }
  if (formData.gradYear && (isNaN(formData.gradYear) || formData.gradYear < 2000 || formData.gradYear > currentYear + 20)) {
    errors.push('Invalid graduation year');
  }
  
  return errors;
}

// 显示消息（成功或错误）
function showMessage(message, isError = false) {
  // 移除现有的消息元素
  const existingMessage = document.querySelector('.form-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // 创建新的消息元素
  const messageDiv = document.createElement('div');
  messageDiv.className = `form-message ${isError ? 'error' : 'success'}`;
  messageDiv.textContent = message;
  
  // 添加样式
  messageDiv.style.cssText = `
    padding: 10px 15px;
    margin: 15px 0;
    border-radius: 5px;
    font-weight: bold;
    ${isError ? 
      'background-color: #ffebee; color: #c62828; border: 1px solid #e57373;' : 
      'background-color: #e8f5e8; color: #2e7d32; border: 1px solid #81c784;'
    }
  `;
  
  // 插入到表单的开始位置
  const form = document.getElementById('addStudentForm');
  form.insertBefore(messageDiv, form.firstChild);
  
  // 3秒后自动移除消息
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.remove();
    }
  }, 3000);
}

// 格式化日期函数
function formatDate(year, month, date) {
  if (!year || !month || !date) return null;
  
  // 月份映射表
  const monthMap = {
    'JAN': '01', 'JANUARY': '01',
    'FEB': '02', 'FEBRUARY': '02',
    'MAR': '03', 'MARCH': '03',
    'APR': '04', 'APRIL': '04',
    'MAY': '05',
    'JUN': '06', 'JUNE': '06',
    'JUL': '07', 'JULY': '07',
    'AUG': '08', 'AUGUST': '08',
    'SEP': '09', 'SEPTEMBER': '09',
    'OCT': '10', 'OCTOBER': '10',
    'NOV': '11', 'NOVEMBER': '11',
    'DEC': '12', 'DECEMBER': '12'
  };

  // 处理月份
  let formattedMonth = month;
  if (isNaN(month)) {
    formattedMonth = monthMap[month.toUpperCase()] || month;
  }
  
  // 确保月份和日期是两位数
  formattedMonth = formattedMonth.toString().padStart(2, '0');
  const formattedDate = date.toString().padStart(2, '0');
  
  return `${year}-${formattedMonth}-${formattedDate}`;
}

// 处理 PLAR 数据
function processPLARData(formData) {
  const plarData = {};
  
  if (formData.PLARexist === 'yes') {
    plarData.hasPLAR = true;
    plarData.isLocal = formData.localPLAR === 'yes' ? 1 : 0;
    plarData.startYear = formData.plaryear;
    plarData.startMonth = formData.plarmonth;
    plarData.startDate = formData.plardate;
    
    // 格式化PLAR日期
    if (plarData.startYear && plarData.startMonth && plarData.startDate) {
      plarData.formattedDate = formatDate(plarData.startYear, plarData.startMonth, plarData.startDate);
    }
    
    plarData.totalCredits = formData.plarTotalCredits || null;
    plarData.compulsoryCredits = formData.plarCompulsoryCredits || null;
  } else {
    plarData.hasPLAR = false;
  }
  
  return plarData;
}

// 处理已完成课程数据
function processCompletedCoursesData(formData) {
  const completedCourses = [];
  
  // 获取所有课程相关的字段
  const compulsoryFields = formData.getAll('compulsory[]');
  const localCourseFields = formData.getAll('localCourse[]');
  const startYearFields = formData.getAll('startYear[]');
  const startMonthFields = formData.getAll('startMonth[]');
  const startDateFields = formData.getAll('startDate[]');
  const completionYearFields = formData.getAll('completionYear[]');
  const completionMonthFields = formData.getAll('completionMonth[]');
  const completionDateFields = formData.getAll('completionDate[]');
  const courseCodeFields = formData.getAll('courseCode[]');
  const midtermGradeFields = formData.getAll('midtermGrade[]');
  const finalGradeFields = formData.getAll('finalGrade[]');
  
  // 遍历所有课程行
  for (let i = 0; i < courseCodeFields.length; i++) {
    const courseCode = courseCodeFields[i]?.trim();
    
    // 只处理有课程代码的行
    if (courseCode) {
      const course = {
        isCompulsory: compulsoryFields[i] === 'yes' ? 1 : 0,
        isLocal: localCourseFields[i] === 'yes' ? 1 : 0,
        startYear: startYearFields[i]?.trim() || null,
        startMonth: startMonthFields[i]?.trim() || null,
        startDate: startDateFields[i]?.trim() || null,
        completionYear: completionYearFields[i]?.trim() || null,
        completionMonth: completionMonthFields[i]?.trim() || null,
        completionDate: completionDateFields[i]?.trim() || null,
        courseCode: courseCode,
        midtermGrade: midtermGradeFields[i]?.trim() || null,
        finalGrade: finalGradeFields[i]?.trim() || null
      };
      
      // 格式化完成日期
      if (course.completionYear && course.completionMonth && course.completionDate) {
        course.formattedCompletionDate = formatDate(course.completionYear, course.completionMonth, course.completionDate);
      }
      
      completedCourses.push(course);
    }
  }
  
  return completedCourses;
}

// 提交学生数据到服务器
async function submitStudentData(formData) {
  try {
    const response = await fetch('/students', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      return { success: true, data: result };
    } else {
      return { success: false, error: result.error || result.message || 'Unknown error' };
    }
  } catch (error) {
    console.error('Network error:', error);
    return { success: false, error: 'Network error: Unable to connect to server' };
  }
}

// 清空表单
function clearForm() {
  const form = document.getElementById('addStudentForm');
  if (form) {
    form.reset();
  }
}

// 处理表单提交
async function handleStudentSubmit(event, saveAndAddAnother = false) {
  event.preventDefault();
  
  const form = document.getElementById('addStudentForm');
  const formData = new FormData(form);
  
  // 转换 FormData 为普通对象
  const studentData = {};
  for (let [key, value] of formData.entries()) {
    if (!key.includes('[]')) {
      studentData[key] = value.trim();
    }
  }
  
  // 处理 PLAR 数据
  const plarData = processPLARData(studentData);
  
  // 处理已完成课程数据
  const completedCoursesData = processCompletedCoursesData(formData);
  const currentCoursesData = processCurrentCoursesData(formData);
  
  // 组合所有数据
  const completeStudentData = {
    ...studentData,
    plarData: plarData,
    completedCourses: completedCoursesData,
    currentCourses: currentCoursesData
  };
  
  console.log('准备提交的完整学生数据:', completeStudentData);
  
  // 验证表单数据
  const validationErrors = validateStudentForm(studentData);
  if (validationErrors.length > 0) {
    showMessage('Please fix the following errors:\n' + validationErrors.join('\n'), true);
    return;
  }
  
  // 显示加载状态
  const submitBtn = event.target;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Saving...';
  submitBtn.disabled = true;
  
  try {
    // 提交数据
    const result = await submitStudentData(completeStudentData);
    
    if (result.success) {
      showMessage(`Student "${studentData.firstName} ${studentData.lastName}" has been successfully added!`);
      
      if (saveAndAddAnother) {
        // 清空表单以便添加下一个学生
        clearForm();
        // 焦点移到第一个输入框
        const firstInput = form.querySelector('input[name="firstName"]');
        if (firstInput) firstInput.focus();
      } else {
        // 等待一下然后跳转到学生列表页面
        setTimeout(() => {
          window.location.href = 'studentmain.html';
        }, 2000);
      }
    } else {
      showMessage(`Error: ${result.error}`, true);
    }
  } catch (error) {
    console.error('Submission error:', error);
    showMessage('An unexpected error occurred. Please try again.', true);
  } finally {
    // 恢复按钮状态
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('页面加载完成，初始化添加学生功能...');
  
  // 检查当前页面是否是添加学生页面
  if (document.getElementById('addStudentForm')) {
    console.log('检测到添加学生表单，绑定事件...');
    
    // 绑定表单提交事件
    const form = document.getElementById('addStudentForm');
    if (form) {
      form.addEventListener('submit', (e) => handleStudentSubmit(e, false));
    }
    
    // 绑定"保存并添加另一个学生"按钮
    const saveAndAddBtn = document.getElementById('saveAndAddAnotherBtn');
    if (saveAndAddBtn) {
      saveAndAddBtn.addEventListener('click', (e) => handleStudentSubmit(e, true));
    }
    
    // 绑定"返回"按钮
    const goBackBtn = document.getElementById('goBackBtn');
    if (goBackBtn) {
      goBackBtn.addEventListener('click', () => {
        window.location.href = 'studentmain.html';
      });
    }
    
    // 绑定添加课程按钮
    const addCourseBtn = document.getElementById('addCourseBtn');
    if (addCourseBtn) {
      addCourseBtn.addEventListener('click', addNewCourseRow);
    }
    const addCurrentCourseBtn = document.getElementById('addCurrentCourseBtn');
    if (addCurrentCourseBtn) {
      addCurrentCourseBtn.addEventListener('click', addNewCurrentCourseRow);
    }
    console.log('添加学生功能初始化完成 ✅');
  }
});

// 添加新的课程行
function addNewCourseRow() {
  const tableBody = document.getElementById('coursesTableBody');
  if (!tableBody) return;
  
  const newRow = document.createElement('tr');
  newRow.innerHTML = `
    <td>
      <select name="compulsory[]">
        <option value="">Compulsory?</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </td>
    <td>
      <select name="localCourse[]">
        <option value="">Local?</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </td>
    <td><input type="text" name="startYear[]" /></td>
    <td><input type="text" name="startMonth[]" /></td>
    <td><input type="text" name="startDate[]" /></td>
    <td><input type="text" name="completionYear[]" /></td>
    <td><input type="text" name="completionMonth[]" /></td>
    <td><input type="text" name="completionDate[]" /></td>
    <td><input type="text" name="courseCode[]" /></td>
    <td><input type="text" name="midtermGrade[]" /></td>
    <td><input type="text" name="finalGrade[]" /></td>
  `;
  
  tableBody.appendChild(newRow);
}

// 删除课程行
function removeRow(button) {
  const row = button.closest('tr');
  const tbody = row.parentNode;
  
  // 确保至少保留一行
  if (tbody.children.length > 1) {
    row.remove();
  } else {
    // 如果只剩一行，清空内容而不是删除
    const inputs = row.querySelectorAll('input, select');
    inputs.forEach(input => {
      if (input.tagName === 'SELECT') {
        input.selectedIndex = 0;
      } else {
        input.value = '';
      }
    });
  }
}

// 增强的添加课程行函数（更新现有的addNewCourseRow函数）
function addNewCourseRow() {
  const tableBody = document.getElementById('coursesTableBody');
  if (!tableBody) return;
  
  const newRow = document.createElement('tr');
  newRow.innerHTML = `
    <td>
      <select name="compulsory[]">
        <option value="">Compulsory?</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </td>
    <td>
      <select name="localCourse[]">
        <option value="">Local?</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </td>
    <td><input type="text" name="startYear[]" placeholder="YYYY" maxlength="4" /></td>
    <td><input type="text" name="startMonth[]" placeholder="JAN or 01" /></td>
    <td><input type="text" name="startDate[]" placeholder="DD" maxlength="2" /></td>
    <td><input type="text" name="completionYear[]" placeholder="YYYY" maxlength="4" /></td>
    <td><input type="text" name="completionMonth[]" placeholder="JAN or 01" /></td>
    <td><input type="text" name="completionDate[]" placeholder="DD" maxlength="2" /></td>
    <td><input type="text" name="courseCode[]" placeholder="e.g. ENG4U" /></td>
    <td><input type="text" name="midtermGrade[]" placeholder="%" /></td>
    <td><input type="text" name="finalGrade[]" placeholder="%" /></td>
    <td>
      <button type="button" class="btn-remove-row" onclick="removeRow(this)" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Remove</button>
    </td>
  `;
  
  tableBody.appendChild(newRow);
}

// PLAR条件显示逻辑
document.addEventListener('DOMContentLoaded', function() {
  const plarExistSelect = document.getElementById('PLARexist');
  const localPLARSelect = document.getElementById('localPLAR');
  const plarFields = document.querySelectorAll('input[name^="plar"]');
  
  if (plarExistSelect) {
    plarExistSelect.addEventListener('change', function() {
      const showPLARFields = this.value === 'yes';
      
      // 显示/隐藏PLAR相关字段
      localPLARSelect.style.display = showPLARFields ? 'block' : 'none';
      plarFields.forEach(field => {
        field.style.display = showPLARFields ? 'block' : 'none';
        // 如果隐藏，清空字段值
        if (!showPLARFields) {
          field.value = '';
        }
      });
      
      if (!showPLARFields) {
        localPLARSelect.selectedIndex = 0;
      }
    });
    
    // 初始状态
    plarExistSelect.dispatchEvent(new Event('change'));
  }
});

function processCurrentCoursesData(formData) {
  const currentCourses = [];
  
  // 获取所有当前课程相关的字段
  const compulsoryFields = formData.getAll('current_compulsory[]');
  const localCourseFields = formData.getAll('current_localCourse[]');
  const yearFields = formData.getAll('current_year[]');
  const monthFields = formData.getAll('current_month[]');
  const startDateFields = formData.getAll('current_startDate[]');
  const courseCodeFields = formData.getAll('current_courseCode[]');
  const gradeFields = formData.getAll('current_grade[]');
  
  // 遍历所有当前课程行
  for (let i = 0; i < courseCodeFields.length; i++) {
    const courseCode = courseCodeFields[i]?.trim();
    
    // 只处理有课程代码的行
    if (courseCode) {
      const course = {
        isCompulsory: compulsoryFields[i] === 'yes' ? 1 : 0,
        isLocal: localCourseFields[i] === 'yes' ? 1 : 0,
        startYear: yearFields[i]?.trim() || null,
        startMonth: monthFields[i]?.trim() || null,
        startDate: startDateFields[i]?.trim() || null,
        courseCode: courseCode,
        midtermGrade: gradeFields[i]?.trim() || null
      };
      
      currentCourses.push(course);
    }
  }
  
  return currentCourses;
}

// 2. 添加这个新函数到文件末尾
function addNewCurrentCourseRow() {
  const tableBody = document.getElementById('currentCoursesTableBody');
  if (!tableBody) return;
  
  const newRow = document.createElement('tr');
  newRow.innerHTML = `
    <td>
      <select name="current_compulsory[]">
        <option value="">Compulsory?</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </td>
    <td>
      <select name="current_localCourse[]">
        <option value="">Local?</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </td>
    <td><input type="text" name="current_year[]" placeholder="YYYY" maxlength="4" /></td>
    <td><input type="text" name="current_month[]" placeholder="JAN or 01" /></td>
    <td><input type="text" name="current_startDate[]" placeholder="DD" maxlength="2" /></td>
    <td><input type="text" name="current_courseCode[]" placeholder="e.g. ENG4U" /></td>
    <td><input type="text" name="current_grade[]" placeholder="%" /></td>
    <td>
      <button type="button" class="btn-remove-row" onclick="removeCurrentCourseRow(this)" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Remove</button>
    </td>
  `;
  
  tableBody.appendChild(newRow);
}

// 3. 添加这个新函数到文件末尾
function removeCurrentCourseRow(button) {
  const row = button.closest('tr');
  const tbody = row.parentNode;
  
  // 确保至少保留一行
  if (tbody.children.length > 1) {
    row.remove();
  } else {
    // 如果只剩一行，清空内容而不是删除
    const inputs = row.querySelectorAll('input, select');
    inputs.forEach(input => {
      if (input.tagName === 'SELECT') {
        input.selectedIndex = 0;
      } else {
        input.value = '';
      }
    });
  }
}

// ========================================
// addstudent.html 相关功能结束
// ========================================







// 导出函数供全局使用
window.resetFilters = resetFilters;