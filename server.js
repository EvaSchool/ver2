const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const port = 3000;
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const libreOfficeConvert = require('libreoffice-convert');
const { promisify } = require('util');
const convertAsync = promisify(libreOfficeConvert.convert);

const JSZip = require('jszip');
const archiver = require('archiver');

const app = express();
const PORT = 3000;

// 启用CORS和JSON解析中间件
app.use(cors());
app.use(bodyParser.json());

// ✅ 添加这行 - 提供静态文件服务
app.use(express.static(__dirname));

// 让 templates 文件夹成为公开可访问的静态目录
app.use('/templates', express.static(path.join(__dirname, 'templates')));

// 数据库连接配置
const db = mysql.createConnection({
  host: 'dbconn.sealosgzg.site',
  user: 'root',
  password: 'xbplf6xf',
  database: 'ossd-automation',
  port: 48765,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

// 连接数据库
db.connect(err => {
  if (err) {
    console.error('数据库连接失败：', err);
    return;
  }
  console.log('成功连接数据库 ✅');
});

// 处理数据库连接丢失
db.on('error', function(err) {
  console.error('数据库连接错误：', err);
  if(err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('尝试重新连接数据库...');
    // 这里可以添加重连逻辑
  } else {
    throw err;
  }
});

// 月份映射函数
function convertMonth(monthStr) {
  const months = {
    'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
    'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
    'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
  };
  return months[monthStr] || '01';
}

// 格式化日期函数
// 格式化日期函数 - 增强版
function formatDate(year, month, day) {
  if (!year) return '';
  
  // 处理月份：如果是月份名称（如 "January", "Feb"），转换为数字格式
  // 如果已经是数字（如 9, "09"），直接使用
  let formattedMonth;
  
  if (typeof month === 'string' && isNaN(month)) {
    // 月份是文字格式（如 "January"），使用 convertMonth 转换
    formattedMonth = convertMonth(month);
  } else if (month) {
    // 月份是数字格式，确保是两位数
    formattedMonth = month.toString().padStart(2, '0');
  } else {
    // 没有提供月份，默认为 01
    formattedMonth = '01';
  }
  
  // 处理日期：确保是两位数
  const formattedDay = day ? day.toString().padStart(2, '0') : '01';
  
  return `${year}-${formattedMonth}-${formattedDay}`;
}

// 格式化OEN函数
function formatOEN(oen) {
  if (!oen) return '';
  const oenStr = oen.toString();
  if (oenStr.length === 9) {
    return `${oenStr.slice(0, 3)}-${oenStr.slice(3, 6)}-${oenStr.slice(6, 9)}`;
  }
  return oenStr;
}


// ========================================
// 正文开始
// ========================================


// ========================================
// student EVA_OST_26 相关功能 (合并单元格版本)
// ========================================
app.get('/generate-ost26-pdf/:oen', async (req, res) => {
  const oen = req.params.oen;
  console.log('Received EVA_OST_26 PDF generation request for OEN:', oen);

  const studentQuery = `
    SELECT student_id, last_name, first_name, OEN, student_number,
      birth_year, birth_month, birth_day,
      enrollment_year, enrollment_month, enrollment_day,
      expected_graduation_year, expected_graduation_month
    FROM students
    WHERE OEN = ?;
  `;

  db.query(studentQuery, [oen], async (err, studentResults) => {
    if (err) {
      console.error('数据库查询失败:', err);
      return res.status(500).json({ error: '数据库查询失败' });
    }
    if (studentResults.length === 0) {
      console.log('未找到OEN为', oen, '的学生');
      return res.status(404).json({ error: '找不到该学生' });
    }

    const student = studentResults[0];

    const coursesQuery = `
      SELECT
        sc.student_id,
        sc.course_code,
        sc.final_grade,
        sc.midterm_grade,
        sc.completion_date,
        sc.is_compulsory,
        sc.is_local,
        sc.status,
        c.course_name,
        c.credit,
        c.course_level
      FROM student_courses sc
      LEFT JOIN courses c ON sc.course_code = c.course_code
      WHERE sc.student_id = ? AND sc.status = 'COMPLETED'
    `;

    db.query(coursesQuery, [student.student_id], async (coursesErr, coursesResults) => {
      if (coursesErr) {
        console.error('查询课程信息失败:', coursesErr);
        return res.status(500).json({ error: '查询课程信息失败' });
      }

      try {
        const templatePath = path.join(__dirname, 'templates', 'EVA_OST_26.pdf');

        if (!fs.existsSync(templatePath)) {
          console.error('EVA_OST_26 PDF模板文件不存在:', templatePath);
          return res.status(500).json({ error: 'EVA_OST_26 PDF模板文件不存在' });
        }

        const existingPdfBytes = fs.readFileSync(templatePath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const form = pdfDoc.getForm();

        const fieldNames = form.getFields().map(field => field.getName());
        console.log('EVA_OST_26 PDF中可用的表单字段:', fieldNames);

        // 安全填充表单字段的辅助函数（保持不变）
        function safeSetTextField(fieldName, value) {
          try {
            const field = form.getTextField(fieldName);
            if (field) {
              const stringValue = value !== null && value !== undefined ? String(value) : '';
              try { field.enableMultiline(); } catch (e) {}
              field.setText(stringValue);
              console.log(`成功填充字段 ${fieldName}`);
            } else {
              console.warn(`字段 ${fieldName} 不存在`);
            }
          } catch (error) {
            console.error(`填充字段 ${fieldName} 时出错:`, error.message);
          }
        }

        function convertMonthToNumber(monthAbbr) {
          const monthMap = {
            'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
            'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
            'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
          };
          return monthMap[monthAbbr?.toUpperCase()] || monthAbbr || '';
        }

        function formatDay(day) {
          if (!day) return '';
          return day.toString().padStart(2, '0');
        }

        function formatOEN(oen) {
          if (!oen) return '';
          const oenStr = oen.toString();
          if (oenStr.length === 9 && /^\d{9}$/.test(oenStr)) {
            return `${oenStr.slice(0,3)}-${oenStr.slice(3,6)}-${oenStr.slice(6,9)}`;
          }
          return oenStr;
        }

        function parseCompletionDate(dateValue) {
          if (!dateValue) return { year: '', month: '' };
          let year = '';
          let month = '';
          if (dateValue instanceof Date) {
            year = dateValue.getFullYear().toString();
            month = (dateValue.getMonth() + 1).toString().padStart(2, '0');
          } else if (typeof dateValue === 'string') {
            const dateParts = dateValue.split('-');
            year = dateParts[0] || '';
            month = dateParts[1] || '';
          }
          return { year, month };
        }

        function formatYear(year, isLocal) {
          if (!year) return '';
          if (isLocal === 0 || isLocal === '0' || isLocal === false) {
            return `*${year}`;
          }
          return year;
        }

        function formatToTwoDecimals(value) {
          if (value === null || value === undefined || value === '') return '0.00';
          const num = parseFloat(value);
          return isNaN(num) ? '0.00' : num.toFixed(2);
        }

        function formatCourseLevel(courseLevel) {
          if (!courseLevel) return '';
          const eslMatch = courseLevel.match(/^ESL(\d+)$/);
          if (eslMatch) return eslMatch[1];
          return courseLevel;
        }

        function formatCompulsory(isCompulsory) {
          if (isCompulsory === 1 || isCompulsory === true || isCompulsory === '1' || isCompulsory === 'Yes') {
            return 'X';
          }
          return '';
        }

        function formatGrade(grade, courseCode) {
          if (courseCode === 'PLE') return 'EQV';
          if (grade === null || grade === undefined || grade === '') return '';
          if (typeof grade === 'string' && /[a-zA-Z]/.test(grade)) return grade;
          const numGrade = parseFloat(grade);
          if (!isNaN(numGrade)) return numGrade.toString();
          return String(grade);
        }

        // ---------------------------------------------------------
        // 核心改动：按列收集每一行的值，最后 join('\n') 一次性填入
        // ---------------------------------------------------------
        function buildAndFillMultilineColumns(courses) {
          console.log(`开始为 ${courses.length} 门已完成课程构建多行字符串`);

          // 分离PLE课程和其他课程
          const pleCourses = courses.filter(course => course.course_code === 'PLE');
          const otherCourses = courses.filter(course => course.course_code !== 'PLE');

          // 其他课程按completion_date升序排序
          otherCourses.sort((a, b) => {
            const dateA = new Date(a.completion_date || '1900-01-01');
            const dateB = new Date(b.completion_date || '1900-01-01');
            return dateA - dateB;
          });

          const sortedCourses = [...pleCourses, ...otherCourses];

          console.log('最终填充顺序:');
          sortedCourses.forEach((course, index) => {
            console.log(`  行${index + 1}: ${course.course_code} - ${course.completion_date}`);
          });

          const cols = {
            code: [], course: [], level: [], grade: [],
            cr: [], compul: [], year: [], month: []
          };

          let totalCr = 0;
          let totalCompul = 0;

          sortedCourses.forEach((course) => {
            const dateInfo = parseCompletionDate(course.completion_date);

            if (course.course_code === 'PLE') {
              cols.code.push(course.course_code || '');
              cols.course.push(course.course_name || '');
              cols.level.push('');
              cols.grade.push('EQV');
              cols.cr.push(formatToTwoDecimals(course.midterm_grade));
              cols.compul.push(formatToTwoDecimals(course.final_grade));
              cols.year.push(formatYear(dateInfo.year, course.is_local));
              cols.month.push(dateInfo.month);

              totalCr += parseFloat(course.midterm_grade) || 0;
              totalCompul += parseFloat(course.final_grade) || 0;
            } else {
              cols.code.push(course.course_code || '');
              cols.course.push(course.course_name || '');
              cols.level.push(formatCourseLevel(course.course_level));
              cols.grade.push(formatGrade(course.final_grade, course.course_code));
              cols.cr.push(formatToTwoDecimals(course.credit));
              const compulMark = formatCompulsory(course.is_compulsory);
              cols.compul.push(compulMark);
              cols.year.push(formatYear(dateInfo.year, course.is_local));
              cols.month.push(dateInfo.month);

              totalCr += parseFloat(course.credit) || 0;
              if (compulMark === 'X') {
                totalCompul += parseFloat(course.credit) || 0;
              }
            }
          });

          // 结束标记行
          cols.code.push('');
          cols.course.push('*** Last Official Entry / Fin du relevés de notes ***');
          cols.level.push('');
          cols.grade.push('');
          cols.cr.push('');
          cols.compul.push('');
          cols.year.push('');
          cols.month.push('');

          safeSetTextField('code', cols.code.join('\n'));
          safeSetTextField('course', cols.course.join('\n'));
          safeSetTextField('level', cols.level.join('\n'));
          safeSetTextField('grade', cols.grade.join('\n'));
          safeSetTextField('cr', cols.cr.join('\n'));
          safeSetTextField('compul', cols.compul.join('\n'));
          safeSetTextField('year', cols.year.join('\n'));
          safeSetTextField('month', cols.month.join('\n'));

          safeSetTextField('totalcr', totalCr.toFixed(2));
          safeSetTextField('totalcompul', totalCompul.toFixed(2));

          console.log(`总学分(totalcr): ${totalCr.toFixed(2)}`);
          console.log(`总必修学分(totalcompul): ${totalCompul.toFixed(2)}`);

          return sortedCourses;
        }

        // 学生基本信息
        safeSetTextField('lastName', student.last_name);
        safeSetTextField('firstName', student.first_name);
        safeSetTextField('OEN', formatOEN(student.OEN));
        safeSetTextField('studentNo', student.student_number);

        // OST版本不填充毕业年份月份
        console.log('OST版本：毕业年份和月份留空白');

        const now = new Date();
        const dateStr = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')}`;
        safeSetTextField('date', dateStr);

        safeSetTextField('currPage', '1');
        safeSetTextField('totalPage', '1');

        safeSetTextField('dobYear', student.birth_year ? student.birth_year.toString() : '');
        safeSetTextField('dobMonth', convertMonthToNumber(student.birth_month));
        safeSetTextField('dobDay', formatDay(student.birth_day));

        safeSetTextField('enrollYear', student.enrollment_year ? student.enrollment_year.toString() : '');
        safeSetTextField('enrollMonth', convertMonthToNumber(student.enrollment_month));
        safeSetTextField('enrollDay', formatDay(student.enrollment_day));

        // 构建多行字段并填充
        const sortedCourses = buildAndFillMultilineColumns(coursesResults);

        const pdfBytes = await pdfDoc.save();

        res.setHeader('Content-Type', 'application/pdf');
        function createSafeFileName(lastName, firstName) {
          const safeLast = (lastName || '').replace(/[<>:"/\\|?*]/g, '').trim();
          const safeFirst = (firstName || '').replace(/[<>:"/\\|?*]/g, '').trim();
          return `${safeLast} ${safeFirst} EVA OST 2026.pdf`;
        }

        const fileName = createSafeFileName(student.last_name, student.first_name);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(Buffer.from(pdfBytes));

        console.log('EVA_OST_26 PDF生成成功，OEN:', oen, '- 已完成课程数量:', sortedCourses.length - 1);
      } catch (error) {
        console.error('生成EVA_OST_26 PDF失败:', error);
        console.error('错误堆栈:', error.stack);
        res.status(500).json({ error: '生成EVA_OST_26 PDF失败', details: error.message });
      }
    });
  });
});
// ========================================
// student EVA_OST_26 相关功能结束
// ========================================


// ====================================
// 注册 登陆
// ===================================

// 用户注册API
app.post('/api/signup', async (req, res) => {
  const { username, password, role } = req.body;
  
  // 验证输入
  if (!username || !password || !role) {
    return res.status(400).json({
      success: false,
      message: '用户名、密码和角色都不能为空'
    });
  }
  
  // 验证角色是否有效
  if (!['USER', 'ADMIN'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: '无效的角色'
    });
  }
  
  // 验证密码长度
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: '密码长度至少6位'
    });
  }
  
  try {
    // 检查用户名是否已存在
    const checkUserQuery = 'SELECT username FROM users WHERE username = ?';
    db.query(checkUserQuery, [username], async (err, results) => {
      if (err) {
        console.error('检查用户名失败:', err);
        return res.status(500).json({
          success: false,
          message: '服务器内部错误'
        });
      }
      
      if (results.length > 0) {
        return res.status(400).json({
          success: false,
          message: '用户名已存在'
        });
      }
      
      try {
        // 加密密码
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        // 插入新用户
        const insertUserQuery = 'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)';
        db.query(insertUserQuery, [username, passwordHash, role], (err, result) => {
          if (err) {
            console.error('创建用户失败:', err);
            return res.status(500).json({
              success: false,
              message: '创建用户失败'
            });
          }
          
          console.log(`新用户注册成功: ${username} (${role})`);
          res.json({
            success: true,
            message: '注册成功',
            user: {
              user_id: result.insertId,
              username: username,
              role: role
            }
          });
        });
      } catch (hashError) {
        console.error('密码加密失败:', hashError);
        res.status(500).json({
          success: false,
          message: '服务器内部错误'
        });
      }
    });
  } catch (error) {
    console.error('注册过程出错:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 用户登录API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // 验证输入
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: '用户名和密码都不能为空'
    });
  }
  
  try {
    // 查找用户
    const getUserQuery = 'SELECT user_id, username, password_hash, role FROM users WHERE username = ?';
    db.query(getUserQuery, [username], async (err, results) => {
      if (err) {
        console.error('查询用户失败:', err);
        return res.status(500).json({
          success: false,
          message: '服务器内部错误'
        });
      }
      
      if (results.length === 0) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }
      
      const user = results[0];
      
      try {
        // 验证密码
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        
        if (passwordMatch) {
          console.log(`用户登录成功: ${username} (${user.role})`);
          res.json({
            success: true,
            message: '登录成功',
            user: {
              user_id: user.user_id,
              username: user.username,
              role: user.role
            }
          });
        } else {
          res.status(401).json({
            success: false,
            message: '用户名或密码错误'
          });
        }
      } catch (compareError) {
        console.error('密码比较失败:', compareError);
        res.status(500).json({
          success: false,
          message: '服务器内部错误'
        });
      }
    });
  } catch (error) {
    console.error('登录过程出错:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});


// ====================================
// 注册 登陆结束
// ====================================

// ========================================
// Classenrolled.html 相关功能
// ========================================

// view mode

app.get('/courses/:courseCode/enrolled-students', (req, res) => {
  console.log('📖 获取课程注册学生请求');
  
  const courseCode = req.params.courseCode;
  console.log('课程代码:', courseCode);
  
  if (!courseCode) {
    return res.status(400).json({
      error: '缺少课程代码参数'
    });
  }
  
  const query = `
    SELECT 
      s.student_id,
      CONCAT(s.last_name, ' ', s.first_name) as full_name,
      sc.status,
      sc.start_year,
      sc.start_month,
      sc.start_day,
      sc.completion_date,
      sc.midterm_grade,
      sc.final_grade
    FROM student_courses sc
    INNER JOIN students s ON sc.student_id = s.student_id
    INNER JOIN courses c ON sc.course_code = c.course_code
    WHERE c.course_code = ?
    ORDER BY s.last_name, s.first_name
  `;
  
  db.query(query, [courseCode], (err, results) => {
    if (err) {
      console.error('❌ 查询课程注册学生失败:', err);
      res.status(500).json({
        error: '课程注册学生查询失败',
        details: err.message
      });
    } else {
      console.log(`✅ 成功获取课程 ${courseCode} 的注册学生，共 ${results.length} 名`);
      res.json(results);
    }
  });
});


//编辑模式

// ========================================
// classenrolled.html Edit Mode 后端 API
// ========================================

// 批量更新课程注册学生信息
app.put('/courses/:courseCode/enrolled-students/bulk-update', (req, res) => {
    console.log('📝 批量更新课程注册学生请求');
    
    const courseCode = req.params.courseCode;
    const { updates } = req.body;
    
    console.log('课程代码:', courseCode);
    console.log('更新数据:', updates);
    
    if (!courseCode || !updates || !Array.isArray(updates)) {
        return res.status(400).json({
            error: '缺少必要参数'
        });
    }
    
    // 开始事务
    db.beginTransaction((err) => {
        if (err) {
            console.error('❌ 开始事务失败:', err);
            return res.status(500).json({
                error: '开始事务失败',
                details: err.message
            });
        }
        
        let completedUpdates = 0;
        const totalUpdates = updates.length;
        
        if (totalUpdates === 0) {
            db.commit((err) => {
                if (err) {
                    console.error('❌ 提交事务失败:', err);
                    return res.status(500).json({
                        error: '提交事务失败',
                        details: err.message
                    });
                }
                return res.json({ message: '没有需要更新的数据', updated: 0 });
            });
            return;
        }
        
        // 处理每个更新
        updates.forEach((update, index) => {
            const {
                studentId,
                status,
                startYear,
                startMonth,
                startDay,
                completionDate,
                midtermGrade,
                finalGrade
            } = update;
            
            const updateQuery = `
                UPDATE student_courses 
                SET 
                    status = ?,
                    start_year = ?,
                    start_month = ?,
                    start_day = ?,
                    completion_date = ?,
                    midterm_grade = ?,
                    final_grade = ?
                WHERE student_id = ? AND course_code = ?
            `;
            
            const params = [
                status,
                startYear,
                startMonth,
                startDay,
                completionDate || null,
                midtermGrade || null,
                finalGrade || null,
                studentId,
                courseCode
            ];
            
            db.query(updateQuery, params, (err, result) => {
                if (err) {
                    console.error(`❌ 更新学生 ${studentId} 失败:`, err);
                    return db.rollback(() => {
                        res.status(500).json({
                            error: `更新学生 ${studentId} 失败`,
                            details: err.message
                        });
                    });
                }
                
                completedUpdates++;
                console.log(`✅ 学生 ${studentId} 更新完成 (${completedUpdates}/${totalUpdates})`);
                
                // 所有更新完成后提交事务
                if (completedUpdates === totalUpdates) {
                    db.commit((err) => {
                        if (err) {
                            console.error('❌ 提交事务失败:', err);
                            return db.rollback(() => {
                                res.status(500).json({
                                    error: '提交事务失败',
                                    details: err.message
                                });
                            });
                        }
                        
                        console.log(`✅ 成功批量更新 ${totalUpdates} 名学生的信息`);
                        res.json({
                            message: '批量更新成功',
                            updated: totalUpdates
                        });
                    });
                }
            });
        });
    });
});

// 从课程中删除学生
app.delete('/courses/:courseCode/students/:studentId', (req, res) => {
    console.log('🗑️ 从课程中删除学生请求');
    
    const courseCode = req.params.courseCode;
    const studentId = req.params.studentId;
    
    console.log('课程代码:', courseCode);
    console.log('学生ID:', studentId);
    
    if (!courseCode || !studentId) {
        return res.status(400).json({
            error: '缺少必要参数'
        });
    }
    
    // 首先检查学生是否在该课程中
    const checkQuery = `
        SELECT * FROM student_courses 
        WHERE student_id = ? AND course_code = ?
    `;
    
    db.query(checkQuery, [studentId, courseCode], (err, results) => {
        if (err) {
            console.error('❌ 检查学生课程关系失败:', err);
            return res.status(500).json({
                error: '检查学生课程关系失败',
                details: err.message
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({
                error: '未找到该学生在此课程中的记录'
            });
        }
        
        // 删除学生课程关系
        const deleteQuery = `
            DELETE FROM student_courses 
            WHERE student_id = ? AND course_code = ?
        `;
        
        db.query(deleteQuery, [studentId, courseCode], (err, result) => {
            if (err) {
                console.error('❌ 删除学生课程关系失败:', err);
                return res.status(500).json({
                    error: '删除学生课程关系失败',
                    details: err.message
                });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: '未找到要删除的记录'
                });
            }
            
            console.log(`✅ 成功将学生 ${studentId} 从课程 ${courseCode} 中移除`);
            res.json({
                message: '学生已从课程中移除',
                studentId: studentId,
                courseCode: courseCode
            });
        });
    });
});

// 新增：单个学生信息更新 API
app.put('/courses/:courseCode/enrolled-students/single-update', (req, res) => {
    console.log('📝 单个学生信息更新请求');
    
    const courseCode = req.params.courseCode;
    const {
        studentId,
        status,
        startYear,
        startMonth,
        startDay,
        completionDate,
        midtermGrade,
        finalGrade
    } = req.body;
    
    console.log('课程代码:', courseCode);
    console.log('学生ID:', studentId);
    console.log('更新数据:', req.body);
    
    if (!courseCode || !studentId) {
        return res.status(400).json({
            error: '缺少必要参数'
        });
    }
    
    const updateQuery = `
        UPDATE student_courses 
        SET 
            status = ?,
            start_year = ?,
            start_month = ?,
            start_day = ?,
            completion_date = ?,
            midterm_grade = ?,
            final_grade = ?
        WHERE student_id = ? AND course_code = ?
    `;
    
    const params = [
        status,
        startYear,
        startMonth,
        startDay,
        completionDate || null,
        midtermGrade || null,
        finalGrade || null,
        studentId,
        courseCode
    ];
    
    db.query(updateQuery, params, (err, result) => {
        if (err) {
            console.error(`❌ 更新学生 ${studentId} 失败:`, err);
            return res.status(500).json({
                error: `更新学生 ${studentId} 失败`,
                details: err.message
            });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: '未找到要更新的记录'
            });
        }
        
        console.log(`✅ 学生 ${studentId} 更新成功`);
        res.json({
            message: '学生信息更新成功',
            studentId: studentId,
            courseCode: courseCode
        });
    });
});
// =========================================
// classenrolled.html 相关功能结束
// =========================================

// =========================================
// Classdetail.html 相关功能
// =========================================  
app.get('/courses/:courseCode', (req, res) => {
  console.log('📖 获取课程详情请求');
  
  const courseCode = req.params.courseCode;
  console.log('课程代码:', courseCode);
  
  if (!courseCode) {
    return res.status(400).json({
      error: '缺少课程代码参数'
    });
  }
  
  const query = `
    SELECT 
      course_code,
      course_name,
      credit,
      course_level,
      is_compulsory,
      description
    FROM courses 
    WHERE course_code = ?
  `;
  
  db.query(query, [courseCode], (err, results) => {
    if (err) {
      console.error('❌ 查询课程详情失败:', err);
      res.status(500).json({
        error: '课程详情查询失败',
        details: err.message
      });
    } else if (results.length === 0) {
      console.log('❌ 未找到课程:', courseCode);
      res.status(404).json({
        error: '未找到该课程'
      });
    } else {
      console.log('✅ 成功获取课程详情:', courseCode);
      res.json(results[0]);
    }
  });
});

// 更新课程详情信息
app.put('/courses/:courseCode/update', (req, res) => {
    console.log('📝 更新课程详情信息请求');
    
    const originalCourseCode = req.params.courseCode;
    const { course_name, course_code, is_compulsory, description } = req.body;
    
    console.log('原课程代码:', originalCourseCode);
    console.log('更新数据:', req.body);
    
    // 验证必填字段
    if (!course_name || !course_code) {
        return res.status(400).json({
            error: '课程名称和课程代码不能为空'
        });
    }
    
    // 检查新的课程代码是否已存在（如果课程代码发生了变化）
    if (course_code !== originalCourseCode) {
        const checkQuery = 'SELECT course_code FROM courses WHERE course_code = ? AND course_code != ?';
        
        db.query(checkQuery, [course_code, originalCourseCode], (err, results) => {
            if (err) {
                console.error('❌ 检查课程代码重复失败:', err);
                return res.status(500).json({
                    error: '服务器错误',
                    details: err.message
                });
            }
            
            if (results.length > 0) {
                return res.status(409).json({
                    error: '课程代码已存在，请使用其他代码'
                });
            }
            
            // 如果没有重复，执行更新
            performCourseDetailUpdate();
        });
    } else {
        // 如果课程代码没有变化，直接执行更新
        performCourseDetailUpdate();
    }
    
    function performCourseDetailUpdate() {
        const updateQuery = `
            UPDATE courses 
            SET 
                course_name = ?,
                course_code = ?,
                is_compulsory = ?,
                description = ?
            WHERE course_code = ?
        `;
        
        const updateParams = [
            course_name,
            course_code,
            is_compulsory,
            description,
            originalCourseCode
        ];
        
        db.query(updateQuery, updateParams, (err, result) => {
            if (err) {
                console.error('❌ 更新课程信息失败:', err);
                res.status(500).json({
                    error: '更新课程信息失败',
                    details: err.message
                });
            } else if (result.affectedRows === 0) {
                console.log('❌ 未找到要更新的课程:', originalCourseCode);
                res.status(404).json({
                    error: '未找到该课程'
                });
            } else {
                console.log('✅ 课程信息更新成功:', course_code);
                res.json({
                    success: true,
                    message: '课程信息更新成功',
                    updated_course_code: course_code
                });
            }
        });
    }
});

// =========================================
// Classdetail.html 相关功能结束
// =========================================



// ========================================
// classmain.html 相关功能
// ========================================

// ========================================
// 课程管理相关 API 端点
// ========================================

// 获取所有课程数据 - 只返回四个需要的字段
app.get('/courses', (req, res) => {
  console.log('📚 获取课程列表请求');
  
  const query = `
    SELECT 
      course_code, 
      course_name, 
      credit, 
      course_level
    FROM courses 
    ORDER BY course_code ASC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ 查询课程失败:', err);
      res.status(500).json({ 
        error: '课程数据查询失败',
        details: err.message 
      });
    } else {
      console.log(`✅ 成功获取 ${results.length} 门课程数据`);
      res.json(results);
    }
  });
});

// ========================================
// classmain.html 相关功能结束
// ========================================



// ========================================
// StudentFile.html 相关功能
// ========================================

// ========================================
// 简化的文件管理相关API端点 - 仅查看功能
// ========================================


// API端点：获取模板文件列表（保持不变）
app.get('/api/templates', (req, res) => {
  console.log('📁 获取模板文件列表请求');
  
  const templatesPath = path.join(__dirname, 'templates');
  
  try {
    // 检查templates文件夹是否存在
    if (!fs.existsSync(templatesPath)) {
      console.warn('⚠️ templates文件夹不存在');
      return res.json([]);
    }
    
    // 读取文件夹内容
    const files = fs.readdirSync(templatesPath);
    
    // 过滤出PDF和DOCX文件
    const templateFiles = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ext === '.pdf' || ext === '.docx';
      })
      .map(file => {
        const filePath = path.join(templatesPath, file);
        const stats = fs.statSync(filePath);
        const ext = path.extname(file).toLowerCase();
        
        return {
          name: file,
          displayName: getDisplayName(file),
          type: ext.substring(1), // 去掉点号
          size: formatFileSize(stats.size),
          lastModified: stats.mtime,
          icon: getFileIcon(ext)
        };
      });
    
    console.log(`✅ 找到 ${templateFiles.length} 个模板文件`);
    res.json(templateFiles);
    
  } catch (error) {
    console.error('❌ 获取模板文件列表失败:', error);
    res.status(500).json({
      error: '获取模板文件列表失败',
      details: error.message
    });
  }
});

// 移除了下载和填充相关的API端点
// app.get('/api/templates/:filename/download/:oen', ...) - 已删除

// 辅助函数：获取文件显示名称
function getDisplayName(filename) {
  const nameMap = {
    'FinalOST.pdf': 'Final Ontario Student Transcript',
    'OST.pdf': 'Ontario Student Transcript',
    'RC.pdf': 'Report Card',
    'FinalOST.docx': 'Final Ontario Student Transcript',
    'OST.docx': 'Ontario Student Transcript',
    'RC.docx': 'Report Card'
  };
  
  return nameMap[filename] || path.basename(filename, path.extname(filename));
}

// 辅助函数：格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 辅助函数：获取文件图标
function getFileIcon(ext) {
  const iconMap = {
    '.pdf': 'fa-file-pdf',
    '.docx': 'fa-file-word',
    '.doc': 'fa-file-word'
  };
  
  return iconMap[ext] || 'fa-file';
}


// =========================================
// 处理docx文件
// =========================================
// 新增：格式化今天的日期为 yyyy-MMM-dd 格式
function formatTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = monthNames[today.getMonth()];
  const day = today.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// 新增：格式化学生日期数据
function formatStudentDate(year, month, day) {
  if (!year) return '';
  
  const formattedDay = day ? day.toString().padStart(2, '0') : '01';
  const monthStr = month || 'JAN';
  
  return `${year}-${monthStr}-${formattedDay}`;
}

// 新增：格式化OEN为 xxx-xxx-xxx 格式
function formatStudentOEN(oen) {
  if (!oen) return '';
  const oenStr = oen.toString();
  if (oenStr.length === 9) {
    return `${oenStr.slice(0, 3)}-${oenStr.slice(3, 6)}-${oenStr.slice(6, 9)}`;
  }
  return oenStr;
}


// 重构后的 processDocxTemplate 函数 - 使用 docxtemplater
async function processDocxTemplate(templatePath, studentData) {
  try {
    console.log('📄 开始使用docxtemplater处理DOCX模板:', templatePath);
    
    // 读取DOCX文件
    const content = fs.readFileSync(templatePath, 'binary');
    
    // 创建 PizZip 实例
    const zip = new PizZip(content);
    
    // 创建 docxtemplater 实例
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true
    });
    
    // 准备替换数据 - 只包含需要的7个占位符
    const templateData = {
      date: formatTodayDate(),
      fname: studentData.first_name || '',
      lname: studentData.last_name || '',
      DOB: formatStudentDate(studentData.birth_year, studentData.birth_month, studentData.birth_day),
      OEN: formatStudentOEN(studentData.oen),
      enrolldate: formatStudentDate(studentData.enrollment_year, studentData.enrollment_month, studentData.enrollment_day),
      graddate: formatStudentDate(studentData.expected_graduation_year, studentData.expected_graduation_month, studentData.expected_graduation_day)
    };
    
    console.log('🔄 模板数据准备完成:', templateData);
    
    // 设置模板数据
    doc.setData(templateData);
    
    try {
      // 渲染文档
      doc.render();
      console.log('✅ 文档渲染成功');
    } catch (error) {
      console.error('❌ 文档渲染失败:', error);
      
      // 提供详细的错误信息
      if (error.properties && error.properties.errors) {
        console.error('📋 详细错误信息:');
        error.properties.errors.forEach((err, index) => {
          console.error(`   ${index + 1}. ${err.message}`);
          if (err.properties) {
            console.error(`      位置: ${err.properties.explanation || 'N/A'}`);
            console.error(`      标签: ${err.properties.id || 'N/A'}`);
            if (err.properties.context) {
              console.error(`      上下文: ${JSON.stringify(err.properties.context)}`);
            }
          }
        });
      }
      
      // 抛出更友好的错误信息
      throw new Error(`模板渲染失败: ${error.message}. 请检查模板中的占位符格式是否正确。`);
    }
    
    // 生成最终的DOCX buffer
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });
    
    console.log('✅ DOCX模板处理完成，输出大小:', buffer.length);
    return buffer;
    
  } catch (error) {
    console.error('❌ DOCX处理失败:', error);
    
    // 如果是 docxtemplater 相关错误，提供更多帮助信息
    if (error.name === 'TemplateError') {
      console.error('💡 模板错误提示: 请检查DOCX文件中的占位符格式');
      console.error('💡 支持的占位符格式示例:');
      console.error('   - {fname} (学生名字)');
      console.error('   - {lname} (学生姓氏)');
      console.error('   - {DOB} (出生日期)');
      console.error('   - {course.name} (课程名称)');
      console.error('   - {#courses}...{/courses} (课程循环)');
    }
    
    throw error;
  }
}

// 修改现有的API端点以支持PDF表单填充
app.post('/api/templates/:filename/generate/:oen', async (req, res) => {
  const { filename, oen } = req.params;
  const { format } = req.body;
  
  console.log(`📝 生成文件请求: ${filename} for OEN: ${oen}`);
  console.log(`📋 请求体:`, req.body);
  console.log(`🎯 选择的格式: ${format}`);
  
  // 根据文件类型确定默认格式
  let actualFormat = format;
  if (!format) {
    if (filename.toLowerCase().endsWith('.docx')) {
      actualFormat = 'docx';
    } else if (filename.toLowerCase().endsWith('.pdf')) {
      actualFormat = 'original';
    } else {
      actualFormat = 'original';
    }
  }
  
  console.log(`🔧 实际使用格式: ${actualFormat}`);
  
  try {
    // 验证文件名安全性
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: '无效的文件名' });
    }
    
    // 检查文件是否存在
    const templatePath = path.join(__dirname, 'templates', filename);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: '模板文件不存在' });
    }
    
    // 检查文件类型
    const isDocx = path.extname(filename).toLowerCase() === '.docx';
    const isPdf = path.extname(filename).toLowerCase() === '.pdf';
    
    console.log(`📄 文件类型检查: DOCX=${isDocx}, PDF=${isPdf}`);
    
    // 获取学生数据
    console.log('📚 获取学生数据');
    const query = `
      SELECT student_id, oen, first_name, last_name, grade, student_number,
             birth_year, birth_month, birth_day,
             enrollment_year, enrollment_month, enrollment_day,
             expected_graduation_year, expected_graduation_month, expected_graduation_day
      FROM students 
      WHERE oen = ?
    `;
    
    db.query(query, [oen], async (err, results) => {
      if (err) {
        console.error('❌ 数据库查询失败:', err);
        return res.status(500).json({ error: '数据库查询失败' });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ error: '未找到学生数据' });
      }
      
      const studentData = results[0];
      console.log(`✅ 找到学生数据: ${studentData.first_name} ${studentData.last_name}`);
      
      try {
        if (isPdf) {
          // 处理PDF表单填充
          console.log('📄 处理PDF表单填充');
          const processedPdfBuffer = await processPdfTemplate(templatePath, studentData);
          const generatedFileName = generateNewFileName(filename, studentData);
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${generatedFileName}"`);
          res.setHeader('Content-Length', processedPdfBuffer.length);
          
          res.send(processedPdfBuffer);
          console.log(`✅ PDF表单填充文件生成成功: ${generatedFileName}`);
          
        } else if (isDocx) {
          // 处理DOCX文件（保持原有逻辑）
          console.log(`🎯 开始根据格式 "${actualFormat}" 生成DOCX文件`);
          
          if (actualFormat === 'both') {
            await generateBothFormats(res, templatePath, studentData, filename);
          } else if (actualFormat === 'pdf') {
            await generatePdfOnly(res, templatePath, studentData, filename);
          } else {
            await generateDocxOnly(res, templatePath, studentData, filename);
          }
        } else {
          // 其他文件类型，直接返回原文件
          console.log('📄 返回原始文件');
          const fileBuffer = fs.readFileSync(templatePath);
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.send(fileBuffer);
        }
        
      } catch (processingError) {
        console.error('❌ 文件处理失败:', processingError);
        if (!res.headersSent) {
          res.status(500).json({ 
            error: '文件处理失败',
            details: processingError.message 
          });
        }
      }
    });
    
  } catch (error) {
    console.error('❌ 生成文件失败:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: '生成文件失败',
        details: error.message 
      });
    }
  }
});

function checkLibreOfficeAvailability() {
  try {
    const { execSync } = require('child_process');
    execSync('libreoffice --version', { stdio: 'ignore' });
    console.log('✅ LibreOffice 可用，支持PDF转换');
    return true;
  } catch (error) {
    console.warn('⚠️ LibreOffice 不可用，PDF转换功能将受限');
    return false;
  }
}

// 新增：处理PDF模板文件
async function handlePdfTemplate(res, templatePath, filename) {
  console.log('📄 处理PDF模板文件:', filename);
  
  try {
    const pdfBuffer = fs.readFileSync(templatePath);
    
    // PDF模板直接使用原文件名
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
    console.log(`✅ PDF模板文件发送成功: ${filename}`);
    
  } catch (error) {
    console.error('❌ PDF模板处理失败:', error);
    throw error;
  }
}

// 调试功能：添加更多日志
function generateDocxOnly(res, templatePath, studentData, filename) {
  console.log('📄 开始生成DOCX文件');
  
  return processDocxTemplate(templatePath, studentData)
    .then(processedBuffer => {
      const generatedFileName = generateNewFileName(filename, studentData);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${generatedFileName}"`);
      res.setHeader('Content-Length', processedBuffer.length);
      
      res.send(processedBuffer);
      console.log(`✅ DOCX文件生成成功: ${generatedFileName}`);
    })
    .catch(error => {
      console.error('❌ DOCX生成失败:', error);
      throw error;
    });
}

// 确保PDF转换函数正常工作
async function generatePdfOnly(res, templatePath, studentData, filename) {
  console.log('📄 开始生成PDF文件');
  
  try {
    // 先生成DOCX
    console.log('📝 先处理DOCX模板...');
    const docxBuffer = await processDocxTemplate(templatePath, studentData);
    
    // 转换为PDF
    console.log('🔄 开始转换DOCX为PDF...');
    const pdfBuffer = await convertAsync(docxBuffer, '.pdf', undefined);
    console.log('✅ PDF转换完成');
    
    // 生成PDF文件名
    const generatedFileName = generateNewFileName(filename, studentData).replace('.docx', '.pdf');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${generatedFileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
    console.log(`✅ PDF文件生成成功: ${generatedFileName}`);
    
  } catch (error) {
    console.error('❌ PDF转换失败:', error);
    throw new Error(`PDF转换失败: ${error.message}`);
  }
}


// 新增：生成两种格式并打包
async function generateBothFormats(res, templatePath, studentData, filename) {
  console.log('📦 生成DOCX和PDF两种格式');
  
  try {
    // 生成DOCX
    const docxBuffer = await processDocxTemplate(templatePath, studentData);
    const docxFileName = generateNewFileName(filename, studentData);
    
    // 转换为PDF
    console.log('🔄 开始转换DOCX为PDF...');
    const pdfBuffer = await convertAsync(docxBuffer, '.pdf', undefined);
    const pdfFileName = docxFileName.replace('.docx', '.pdf');
    console.log('✅ PDF转换完成');
    
    // 创建ZIP压缩包
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });
    
    // 设置响应头
    const zipFileName = `${studentData.last_name} ${studentData.first_name} EVA ${path.basename(filename, '.docx')}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
    
    // 将archive连接到响应流
    archive.pipe(res);
    
    // 添加文件到ZIP
    archive.append(docxBuffer, { name: docxFileName });
    archive.append(pdfBuffer, { name: pdfFileName });
    
    // 完成压缩
    await archive.finalize();
    
    console.log(`✅ 双格式ZIP文件生成成功: ${zipFileName}`);
    
  } catch (error) {
    console.error('❌ 双格式生成失败:', error);
    throw erro;
  }
}
// 修复：批量生成文件的API端点（支持格式选择）
app.post('/api/templates/generate-multiple/:oen', async (req, res) => {
  const { oen } = req.params;
  const { files } = req.body;
  
  console.log(`📦 批量生成文件请求:`, files, `for OEN: ${oen}`);
  
  try {
    if (!files || !Array.isArray(files) || files.length === 0) {
      console.error('❌ 无效的请求体:', req.body);
      return res.status(400).json({ error: '未选择文件或文件格式无效' });
    }
    
    // 获取学生数据
    const query = `
      SELECT student_id, oen, first_name, last_name, grade,
             birth_year, birth_month, birth_day,
             enrollment_year, enrollment_month, enrollment_day,
             expected_graduation_year, expected_graduation_month, expected_graduation_day
      FROM students 
      WHERE oen = ?
    `;
    
    db.query(query, [oen], async (err, results) => {
      if (err) {
        console.error('❌ 数据库查询失败:', err);
        return res.status(500).json({ error: '数据库查询失败' });
      }
      
      if (results.length === 0) {
        console.error('❌ 未找到学生数据，OEN:', oen);
        return res.status(404).json({ error: '未找到学生数据' });
      }
      
      const studentData = results[0];
      console.log(`✅ 找到学生数据: ${studentData.first_name} ${studentData.last_name}`);
      
      try {
        // 创建ZIP压缩包
        const archive = archiver('zip', {
          zlib: { level: 9 }
        });
        
        // 设置响应头
        const zipFileName = `${studentData.last_name} ${studentData.first_name} EVA Documents.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
        
        console.log(`📦 开始创建ZIP文件: ${zipFileName}`);
        
        // 将archive连接到响应流
        archive.pipe(res);
        
        let processedFiles = 0;
        let totalFiles = 0;
        
        // 处理每个文件
        for (const fileInfo of files) {
          const { filename, format } = fileInfo;
          
          console.log(`🔄 处理文件: ${filename}, 格式: ${format}`);
          
          // 验证文件名安全性
          if (filename.includes('..') || filename.includes('/')) {
            console.warn('⚠️ 跳过无效文件名:', filename);
            continue;
          }
          
          const templatePath = path.join(__dirname, 'templates', filename);
          
          if (!fs.existsSync(templatePath)) {
            console.warn('⚠️ 模板文件不存在:', filename);
            continue;
          }
          
          const isDocx = path.extname(filename).toLowerCase() === '.docx';
          const isPdf = path.extname(filename).toLowerCase() === '.pdf';
          
          try {
            if (isPdf) {
              // 处理PDF表单填充
              console.log(`📄 处理PDF表单文件: ${filename}`);
              const processedBuffer = await processPdfTemplate(templatePath, studentData);
              const newFileName = generateNewFileName(filename, studentData);
              archive.append(processedBuffer, { name: newFileName });
              processedFiles++;
              totalFiles++;
              console.log(`✅ 已添加填充后的PDF文件到ZIP: ${newFileName}`);
              
            } else if (isDocx) {
              // 处理DOCX文件（保持原有逻辑）
              console.log(`📝 处理DOCX文件: ${filename}, 格式: ${format}`);
              
              const docxBuffer = await processDocxTemplate(templatePath, studentData);
              const baseFileName = generateNewFileName(filename, studentData);
              
              let actualFormat = format || 'docx';
              
              if (actualFormat === 'docx' || actualFormat === 'both' || !actualFormat) {
                archive.append(docxBuffer, { name: baseFileName });
                totalFiles++;
                console.log(`✅ 已添加DOCX文件到ZIP: ${baseFileName}`);
              }
              
              if (actualFormat === 'pdf' || actualFormat === 'both') {
                try {
                  const pdfBuffer = await convertAsync(docxBuffer, '.pdf', undefined);
                  const pdfFileName = baseFileName.replace('.docx', '.pdf');
                  archive.append(pdfBuffer, { name: pdfFileName });
                  totalFiles++;
                  console.log(`✅ 已添加PDF文件到ZIP: ${pdfFileName}`);
                } catch (pdfError) {
                  console.error(`❌ PDF转换失败 ${filename}:`, pdfError);
                  if (actualFormat === 'pdf') {
                    archive.append(docxBuffer, { name: baseFileName });
                    totalFiles++;
                    console.log(`⚠️ PDF转换失败，已添加DOCX版本: ${baseFileName}`);
                  }
                }
              }
              
              processedFiles++;
              
            } else {
              // 其他类型文件，直接添加
              console.log(`📄 处理其他文件: ${filename}`);
              const fileBuffer = fs.readFileSync(templatePath);
              archive.append(fileBuffer, { name: filename });
              processedFiles++;
              totalFiles++;
              console.log(`✅ 已添加文件到ZIP: ${filename}`);
            }
            
          } catch (fileError) {
            console.error(`❌ 处理文件失败 ${filename}:`, fileError);
            // 继续处理其他文件，不中断整个流程
          }
        }
        
        // 检查是否有文件被处理
        if (processedFiles === 0) {
          console.error('❌ 没有文件被成功处理');
          return res.status(400).json({ error: '没有有效的文件可以处理' });
        }
        
        console.log(`📊 处理完成: ${processedFiles} 个源文件，生成 ${totalFiles} 个输出文件`);
        
        // 完成压缩
        await archive.finalize();
        
        console.log(`✅ 批量ZIP文件生成完成: ${zipFileName}`);
        
      } catch (processingError) {
        console.error('❌ 批量文件处理失败:', processingError);
        if (!res.headersSent) {
          res.status(500).json({ 
            error: '批量文件处理失败',
            details: processingError.message 
          });
        }
      }
    });
    
  } catch (error) {
    console.error('❌ 批量生成文件失败:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: '批量生成文件失败',
        details: error.message 
      });
    }
  }
});

// 修复：PDF转换函数（添加错误处理）
async function convertDocxToPdf(docxBuffer) {
  try {
    console.log('🔄 开始DOCX到PDF转换...');
    
    // 检查LibreOffice是否可用
    if (!checkLibreOfficeAvailability()) {
      throw new Error('LibreOffice未安装或不可用');
    }
    
    const pdfBuffer = await convertAsync(docxBuffer, '.pdf', undefined);
    console.log('✅ DOCX到PDF转换完成');
    return pdfBuffer;
  } catch (error) {
    console.error('❌ DOCX到PDF转换失败:', error);
    throw new Error(`PDF转换失败: ${error.message}。请确保已安装LibreOffice。`);
  }
}





function generateNewFileName(originalFilename, studentData) {
  const lastName = studentData.last_name || '';
  const firstName = studentData.first_name || '';
  const fileExtension = path.extname(originalFilename);
  
  // 从原始文件名中提取主要部分（移除扩展名）
  const baseName = path.basename(originalFilename, fileExtension);
  
  // 创建文档类型映射，简化文件名
  const documentTypeMap = {
    'Enrollment Letter': 'Enrollment Letter',
    'LOA 2025': 'LOA',
    'Predicted Grades 2025': 'Predicted Grades',
    'FinalOST': 'EVA Final OST',
    'OST': 'EVA OST',
    'RC': 'Report Card',
    'EVA_OST_26': 'EVA OST',
    'EVA_FINAL_OST_26': 'EVA Final OST',
    'KAI_OST_26': 'KAI OST',
    'KAI_FINAL_OST_26': 'KAI Final OST'
  };
  
  // 获取简化的文档类型名
  const docType = documentTypeMap[baseName] || baseName;
  
  // 新格式: LastName FirstName EVA DocumentType
  const newFileName = `${lastName} ${firstName} ${docType}${fileExtension}`;
  
  console.log(`📝 文件命名: ${originalFilename} -> ${newFileName}`);
  return newFileName;
}

// 新增：获取学生课程数据的函数
async function getStudentCourses(oen) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT course_code, course_name, course_level, predicted_grade, completion_date
      FROM student_courses 
      WHERE oen = ?
      ORDER BY course_code
    `;
    
    db.query(query, [oen], (err, results) => {
      if (err) {
        console.error('❌ 获取课程数据失败:', err);
        resolve([]); // 如果查询失败，返回空数组而不是错误
      } else {
        console.log(`✅ 找到 ${results.length} 门课程数据`);
        resolve(results);
      }
    });
  });
}

// =========================================
// 处理docx文件结束
// =========================================

// ========================================
// 处理pdf功能
// ========================================

async function getStudentCompletedCourses(studentId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        sc.student_id,
        sc.course_code,
        sc.final_grade,
        sc.midterm_grade,
        sc.completion_date,
        sc.is_compulsory,
        sc.is_local,
        sc.status,
        c.course_name,
        c.credit,
        c.course_level
      FROM student_courses sc
      LEFT JOIN courses c ON sc.course_code = c.course_code
      WHERE sc.student_id = ? AND sc.status = 'COMPLETED'
    `;
    
    db.query(query, [studentId], (err, results) => {
      if (err) {
        console.error('❌ 获取课程数据失败:', err);
        resolve([]); // 如果查询失败，返回空数组而不是错误
      } else {
        console.log(`✅ 找到 ${results.length} 门已完成课程数据`);
        resolve(results);
      }
    });
  });
}

// 月份转换函数
function convertMonthToNumber(monthAbbr) {
  const monthMap = {
    'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
    'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
    'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
  };
  return monthMap[monthAbbr?.toUpperCase()] || monthAbbr || '';
}

// 格式化日期函数
function formatDay(day) {
  if (!day) return '';
  return day.toString().padStart(2, '0');
}


async function processPdfTemplate(templatePath, studentData) {
  try {
    console.log('📄 开始处理PDF表单填充:', templatePath);
    
    // 读取PDF文件
    const existingPdfBytes = fs.readFileSync(templatePath);
    
    // 加载PDF文档
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // 获取表单
    const form = pdfDoc.getForm();
    

    const filename = path.basename(templatePath);
    const isKaiFinalOst26 = filename.toLowerCase().includes('kai_final_ost_26');
    const isEvaFinalOst26 = filename.toLowerCase().includes('eva_final_ost_26') || 
                            (filename.toLowerCase().includes('final') && filename.toLowerCase().includes('ost_26') && !isKaiFinalOst26);
    const isKaiOst26 = filename.toLowerCase().includes('kai_ost_26') && !isKaiFinalOst26;
    const isEvaOst26 = filename.toLowerCase().includes('eva_ost_26') || 
                        (filename.toLowerCase().includes('ost_26') && !isKaiOst26 && !isKaiFinalOst26 && !isEvaFinalOst26);
    const isOST = filename.toLowerCase().includes('ost');
    const isFinalOST = filename.toLowerCase().includes('finalost') || filename.toLowerCase().includes('final');

    console.log(`📋 处理PDF类型: ${filename}, isKaiFinalOst26: ${isKaiFinalOst26}, isEvaFinalOst26: ${isEvaFinalOst26}, isKaiOst26: ${isKaiOst26}, isEvaOst26: ${isEvaOst26}, isOST: ${isOST}, isFinalOST: ${isFinalOST}`);

    if (isKaiFinalOst26) {
      return await processEvaFinalOst26pdf(pdfDoc, form, studentData, '******');
    } else if (isEvaFinalOst26) {
      return await processEvaFinalOst26pdf(pdfDoc, form, studentData);
    } else if (isKaiOst26) {
      return await processEvaOst26pdf(pdfDoc, form, studentData, '******');
    } else if (isEvaOst26) {
      return await processEvaOst26pdf(pdfDoc, form, studentData);
    } else if (isOST || isFinalOST) {
      return await processOSTpdf(pdfDoc, form, studentData, isFinalOST);
    } else {
      return await processGenericPdf(pdfDoc, form, studentData);
    }

      } catch (error) {
        console.error('❌ PDF表单处理失败:', error);
        throw new Error(`PDF表单处理失败: ${error.message}`);
      }
    }

// ========================================
// 新增：处理OST/FinalOST类型PDF的函数
// ========================================

async function processOSTpdf(pdfDoc, form, studentData, isFinalOST) {
  try {
    console.log(`📋 开始处理${isFinalOST ? 'Final OST' : 'OST'}类型PDF`);
    
    // 获取所有表单字段名，用于调试
    const fieldNames = form.getFields().map(field => field.getName());
    console.log('PDF中可用的表单字段:', fieldNames);

    // 安全填充表单字段的辅助函数
    function safeSetTextField(fieldName, value) {
      try {
        const field = form.getTextField(fieldName);
        if (field) {
          const stringValue = value !== null && value !== undefined ? String(value) : '';
          field.setText(stringValue);
          console.log(`成功填充字段 ${fieldName}: ${stringValue}`);
        } else {
          console.warn(`字段 ${fieldName} 不存在`);
        }
      } catch (error) {
        console.error(`填充字段 ${fieldName} 时出错:`, error.message);
      }
    }

    // 格式化OEN函数
    function formatOEN(oen) {
      if (!oen) return '';
      const oenStr = oen.toString();
      if (oenStr.length === 9 && /^\d{9}$/.test(oenStr)) {
        return `${oenStr.slice(0,3)}-${oenStr.slice(3,6)}-${oenStr.slice(6,9)}`;
      }
      return oenStr;
    }

    // 获取学生课程数据
    console.log('📚 获取学生课程数据，student_id:', studentData.student_id);
    const coursesData = await getStudentCompletedCourses(studentData.student_id);
    
    // 填充学生基本信息
    safeSetTextField('lastName', studentData.last_name);
    safeSetTextField('firstName', studentData.first_name);
    safeSetTextField('OEN', formatOEN(studentData.oen));
    safeSetTextField('studentNo', studentData.student_number);

    // 当前日期 yyyy/mm/dd
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')}`;
    safeSetTextField('date', dateStr);

    // 固定页码
    safeSetTextField('currPage', '1');
    safeSetTextField('totalPage', '1');

    // 出生日期
    safeSetTextField('dobYear', studentData.birth_year ? studentData.birth_year.toString() : '');
    safeSetTextField('dobMonth', convertMonthToNumber(studentData.birth_month));
    safeSetTextField('dobDay', formatDay(studentData.birth_day));

    // 入学日期
    safeSetTextField('enrollYear', studentData.enrollment_year ? studentData.enrollment_year.toString() : '');
    safeSetTextField('enrollMonth', convertMonthToNumber(studentData.enrollment_month));
    safeSetTextField('enrollDay', formatDay(studentData.enrollment_day));

    // 只有FinalOST才填充毕业信息
    if (isFinalOST) {
      safeSetTextField('gradYear', studentData.expected_graduation_year ? studentData.expected_graduation_year.toString() : '');
      const gradMonth = convertMonthToNumber(studentData.expected_graduation_month);
      safeSetTextField('gradMon', gradMonth);
      console.log('填充毕业信息 - 年份:', studentData.expected_graduation_year, '月份:', studentData.expected_graduation_month, '->', gradMonth);
    } else {
      console.log('OST版本：毕业年份和月份留空白');
    }

    // 处理课程数据
    if (coursesData.length > 0) {
      await fillOSTCourseData(coursesData, safeSetTextField);
    }

    console.log('表单字段填充完成');

    // 生成填充后的PDF字节数组
    const pdfBytes = await pdfDoc.save();
    console.log(`✅ ${isFinalOST ? 'Final OST' : 'OST'} PDF处理完成，输出大小:`, pdfBytes.length);
    return Buffer.from(pdfBytes);
    
  } catch (error) {
    console.error(`❌ ${isFinalOST ? 'Final OST' : 'OST'} PDF处理失败:`, error);
    throw error;
  }
}


// ========================================
// 新增：处理EVA_OST_26类型PDF的函数（合并单元格版本）
// ========================================

async function processEvaOst26pdf(pdfDoc, form, studentData, endMarkerText = '                           *** Last Official Entry / Fin du relevés de notes ***') {
  try {
    console.log('📋 开始处理EVA_OST_26类型PDF');

    const fieldNames = form.getFields().map(field => field.getName());
    console.log('PDF中可用的表单字段:', fieldNames);

    // 安全填充表单字段的辅助函数（支持多行）
    function safeSetTextField(fieldName, value) {
      try {
        const field = form.getTextField(fieldName);
        if (field) {
          const stringValue = value !== null && value !== undefined ? String(value) : '';
          try { field.enableMultiline(); } catch (e) {}
          field.setText(stringValue);
          console.log(`成功填充字段 ${fieldName}`);
        } else {
          console.warn(`字段 ${fieldName} 不存在`);
        }
      } catch (error) {
        console.error(`填充字段 ${fieldName} 时出错:`, error.message);
      }
    }

    function formatOEN(oen) {
      if (!oen) return '';
      const oenStr = oen.toString();
      if (oenStr.length === 9 && /^\d{9}$/.test(oenStr)) {
        return `${oenStr.slice(0,3)}-${oenStr.slice(3,6)}-${oenStr.slice(6,9)}`;
      }
      return oenStr;
    }

    function parseCompletionDate(dateValue) {
      if (!dateValue) return { year: '', month: '' };
      let year = '';
      let month = '';
      if (dateValue instanceof Date) {
        year = dateValue.getFullYear().toString();
        month = (dateValue.getMonth() + 1).toString().padStart(2, '0');
      } else if (typeof dateValue === 'string') {
        const dateParts = dateValue.split('-');
        year = dateParts[0] || '';
        month = dateParts[1] || '';
      }
      return { year, month };
    }

    function formatYear(year, isLocal) {
      if (!year) return '';
      if (isLocal === 0 || isLocal === '0' || isLocal === false) {
        return `*${year}`;
      }
      return year;
    }

    function formatToTwoDecimals(value) {
      if (value === null || value === undefined || value === '') return '0.00';
      const num = parseFloat(value);
      return isNaN(num) ? '0.00' : num.toFixed(2);
    }

    function formatCourseLevel(courseLevel) {
      if (!courseLevel) return '';
      const eslMatch = courseLevel.match(/^ESL(\d+)$/);
      if (eslMatch) return eslMatch[1];
      return courseLevel;
    }

    function formatCompulsory(isCompulsory) {
      if (isCompulsory === 1 || isCompulsory === true || isCompulsory === '1' || isCompulsory === 'Yes') {
        return 'X';
      }
      return '';
    }

    function formatGrade(grade, courseCode) {
      if (courseCode === 'PLE') return 'EQV';
      if (grade === null || grade === undefined || grade === '') return '';
      if (typeof grade === 'string' && /[a-zA-Z]/.test(grade)) return grade;
      const numGrade = parseFloat(grade);
      if (!isNaN(numGrade)) return numGrade.toString();
      return String(grade);
    }

    // 获取学生课程数据
    console.log('📚 获取学生课程数据，student_id:', studentData.student_id);
    const coursesData = await getStudentCompletedCourses(studentData.student_id);

    // 学生基本信息
    safeSetTextField('lastName', studentData.last_name);
    safeSetTextField('firstName', studentData.first_name);
    safeSetTextField('OEN', formatOEN(studentData.oen));
    safeSetTextField('studentNo', studentData.student_number);

    const now = new Date();
    const dateStr = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')}`;
    safeSetTextField('date', dateStr);

    // 注意：EVA_OST_26.pdf模板里没有 currPage / totalPage 字段，不填充

    safeSetTextField('dobYear', studentData.birth_year ? studentData.birth_year.toString() : '');
    safeSetTextField('dobMonth', convertMonthToNumber(studentData.birth_month));
    safeSetTextField('dobDay', formatDay(studentData.birth_day));

    safeSetTextField('enrollYear', studentData.enrollment_year ? studentData.enrollment_year.toString() : '');
    safeSetTextField('enrollMonth', convertMonthToNumber(studentData.enrollment_month));
    safeSetTextField('enrollDay', formatDay(studentData.enrollment_day));

    console.log('OST版本：毕业年份和月份留空白');

    // ---- 构建多行课程数据并一次性填入合并字段 ----
    if (coursesData.length > 0) {
      const pleCourses = coursesData.filter(c => c.course_code === 'PLE');
      const otherCourses = coursesData.filter(c => c.course_code !== 'PLE');

      otherCourses.sort((a, b) => {
        const dateA = new Date(a.completion_date || '1900-01-01');
        const dateB = new Date(b.completion_date || '1900-01-01');
        return dateA - dateB;
      });

      const sortedCourses = [...pleCourses, ...otherCourses];

      console.log('最终填充顺序:');
      sortedCourses.forEach((course, index) => {
        console.log(`  行${index + 1}: ${course.course_code} - ${course.completion_date}`);
      });

      const cols = {
        code: [], course: [], level: [], grade: [],
        cr: [], compul: [], year: [], month: []
      };

      let totalCr = 0;
      let totalCompul = 0;

      sortedCourses.forEach((course) => {
        const dateInfo = parseCompletionDate(course.completion_date);

        if (course.course_code === 'PLE') {
          cols.code.push(course.course_code || '');
          cols.course.push(course.course_name || '');
          cols.level.push('');
          cols.grade.push('EQV');
          cols.cr.push(formatToTwoDecimals(course.midterm_grade));
          cols.compul.push(formatToTwoDecimals(course.final_grade));
          cols.year.push(formatYear(dateInfo.year, course.is_local));
          cols.month.push(dateInfo.month);

          totalCr += parseFloat(course.midterm_grade) || 0;
          totalCompul += parseFloat(course.final_grade) || 0;
        } else {
          cols.code.push(course.course_code || '');
          cols.course.push(course.course_name || '');
          cols.level.push(formatCourseLevel(course.course_level));
          cols.grade.push(formatGrade(course.final_grade, course.course_code));
          cols.cr.push(formatToTwoDecimals(course.credit));
          const compulMark = formatCompulsory(course.is_compulsory);
          cols.compul.push(compulMark);
          cols.year.push(formatYear(dateInfo.year, course.is_local));
          cols.month.push(dateInfo.month);

          totalCr += parseFloat(course.credit) || 0;
          if (compulMark === 'X') {
            totalCompul += parseFloat(course.credit) || 0;
          }
        }
      });

      // 结束标记行
      cols.code.push('');
      cols.course.push(endMarkerText);
      cols.level.push('');
      cols.grade.push('');
      cols.cr.push('');
      cols.compul.push('');
      cols.year.push('');
      cols.month.push('');

      safeSetTextField('code', cols.code.join('\n'));
      safeSetTextField('course', cols.course.join('\n'));
      safeSetTextField('level', cols.level.join('\n'));
      safeSetTextField('grade', cols.grade.join('\n'));
      safeSetTextField('cr', cols.cr.join('\n'));
      safeSetTextField('compul', cols.compul.join('\n'));
      safeSetTextField('year', cols.year.join('\n'));
      safeSetTextField('month', cols.month.join('\n'));

      safeSetTextField('totalcr', totalCr.toFixed(2));
      safeSetTextField('totalcompul', totalCompul.toFixed(2));

      console.log(`总学分(totalcr): ${totalCr.toFixed(2)}`);
      console.log(`总必修学分(totalcompul): ${totalCompul.toFixed(2)}`);
    }

    console.log('表单字段填充完成');

    const pdfBytes = await pdfDoc.save();
    console.log('✅ EVA_OST_26 PDF处理完成，输出大小:', pdfBytes.length);
    return Buffer.from(pdfBytes);

  } catch (error) {
    console.error('❌ EVA_OST_26 PDF处理失败:', error);
    throw error;
  }
}
// ========================================
// 新增：处理EVA_FINAL_OST_26类型PDF的函数（合并单元格版本，含毕业信息）
// ========================================

async function processEvaFinalOst26pdf(pdfDoc, form, studentData, endMarkerText = '                           *** Last Official Entry / Fin du relevés de notes ***') {
  try {
    console.log('📋 开始处理EVA_FINAL_OST_26类型PDF');

    const fieldNames = form.getFields().map(field => field.getName());
    console.log('PDF中可用的表单字段:', fieldNames);

    function safeSetTextField(fieldName, value) {
      try {
        const field = form.getTextField(fieldName);
        if (field) {
          const stringValue = value !== null && value !== undefined ? String(value) : '';
          try { field.enableMultiline(); } catch (e) {}
          field.setText(stringValue);
          console.log(`成功填充字段 ${fieldName}`);
        } else {
          console.warn(`字段 ${fieldName} 不存在`);
        }
      } catch (error) {
        console.error(`填充字段 ${fieldName} 时出错:`, error.message);
      }
    }

    function formatOEN(oen) {
      if (!oen) return '';
      const oenStr = oen.toString();
      if (oenStr.length === 9 && /^\d{9}$/.test(oenStr)) {
        return `${oenStr.slice(0,3)}-${oenStr.slice(3,6)}-${oenStr.slice(6,9)}`;
      }
      return oenStr;
    }

    function parseCompletionDate(dateValue) {
      if (!dateValue) return { year: '', month: '' };
      let year = '';
      let month = '';
      if (dateValue instanceof Date) {
        year = dateValue.getFullYear().toString();
        month = (dateValue.getMonth() + 1).toString().padStart(2, '0');
      } else if (typeof dateValue === 'string') {
        const dateParts = dateValue.split('-');
        year = dateParts[0] || '';
        month = dateParts[1] || '';
      }
      return { year, month };
    }

    function formatYear(year, isLocal) {
      if (!year) return '';
      if (isLocal === 0 || isLocal === '0' || isLocal === false) {
        return `*${year}`;
      }
      return year;
    }

    function formatToTwoDecimals(value) {
      if (value === null || value === undefined || value === '') return '0.00';
      const num = parseFloat(value);
      return isNaN(num) ? '0.00' : num.toFixed(2);
    }

    function formatCourseLevel(courseLevel) {
      if (!courseLevel) return '';
      const eslMatch = courseLevel.match(/^ESL(\d+)$/);
      if (eslMatch) return eslMatch[1];
      return courseLevel;
    }

    function formatCompulsory(isCompulsory) {
      if (isCompulsory === 1 || isCompulsory === true || isCompulsory === '1' || isCompulsory === 'Yes') {
        return 'X';
      }
      return '';
    }

    function formatGrade(grade, courseCode) {
      if (courseCode === 'PLE') return 'EQV';
      if (grade === null || grade === undefined || grade === '') return '';
      if (typeof grade === 'string' && /[a-zA-Z]/.test(grade)) return grade;
      const numGrade = parseFloat(grade);
      if (!isNaN(numGrade)) return numGrade.toString();
      return String(grade);
    }

    console.log('📚 获取学生课程数据，student_id:', studentData.student_id);
    const coursesData = await getStudentCompletedCourses(studentData.student_id);

    // 学生基本信息
    safeSetTextField('lastName', studentData.last_name);
    safeSetTextField('firstName', studentData.first_name);
    safeSetTextField('OEN', formatOEN(studentData.oen));
    safeSetTextField('studentNo', studentData.student_number);

    const now = new Date();
    const dateStr = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')}`;
    safeSetTextField('date', dateStr);

    safeSetTextField('dobYear', studentData.birth_year ? studentData.birth_year.toString() : '');
    safeSetTextField('dobMonth', convertMonthToNumber(studentData.birth_month));
    safeSetTextField('dobDay', formatDay(studentData.birth_day));

    safeSetTextField('enrollYear', studentData.enrollment_year ? studentData.enrollment_year.toString() : '');
    safeSetTextField('enrollMonth', convertMonthToNumber(studentData.enrollment_month));
    safeSetTextField('enrollDay', formatDay(studentData.enrollment_day));

    // Final版本：填充毕业年份和月份（直接使用students表里的字段，不用当前月份）
    safeSetTextField('gradYear', studentData.expected_graduation_year ? studentData.expected_graduation_year.toString() : '');
    const gradMonth = convertMonthToNumber(studentData.expected_graduation_month);
    safeSetTextField('gradMon', gradMonth);
    console.log('填充毕业信息 - 年份:', studentData.expected_graduation_year, '月份:', studentData.expected_graduation_month, '->', gradMonth);

    // ---- 构建多行课程数据并一次性填入合并字段 ----
    if (coursesData.length > 0) {
      const pleCourses = coursesData.filter(c => c.course_code === 'PLE');
      const otherCourses = coursesData.filter(c => c.course_code !== 'PLE');

      otherCourses.sort((a, b) => {
        const dateA = new Date(a.completion_date || '1900-01-01');
        const dateB = new Date(b.completion_date || '1900-01-01');
        return dateA - dateB;
      });

      const sortedCourses = [...pleCourses, ...otherCourses];

      console.log('最终填充顺序:');
      sortedCourses.forEach((course, index) => {
        console.log(`  行${index + 1}: ${course.course_code} - ${course.completion_date}`);
      });

      const cols = {
        code: [], course: [], level: [], grade: [],
        cr: [], compul: [], year: [], month: []
      };

      let totalCr = 0;
      let totalCompul = 0;

      sortedCourses.forEach((course) => {
        const dateInfo = parseCompletionDate(course.completion_date);

        if (course.course_code === 'PLE') {
          cols.code.push(course.course_code || '');
          cols.course.push(course.course_name || '');
          cols.level.push('');
          cols.grade.push('EQV');
          cols.cr.push(formatToTwoDecimals(course.midterm_grade));
          cols.compul.push(formatToTwoDecimals(course.final_grade));
          cols.year.push(formatYear(dateInfo.year, course.is_local));
          cols.month.push(dateInfo.month);

          totalCr += parseFloat(course.midterm_grade) || 0;
          totalCompul += parseFloat(course.final_grade) || 0;
        } else {
          cols.code.push(course.course_code || '');
          cols.course.push(course.course_name || '');
          cols.level.push(formatCourseLevel(course.course_level));
          cols.grade.push(formatGrade(course.final_grade, course.course_code));
          cols.cr.push(formatToTwoDecimals(course.credit));
          const compulMark = formatCompulsory(course.is_compulsory);
          cols.compul.push(compulMark);
          cols.year.push(formatYear(dateInfo.year, course.is_local));
          cols.month.push(dateInfo.month);

          totalCr += parseFloat(course.credit) || 0;
          if (compulMark === 'X') {
            totalCompul += parseFloat(course.credit) || 0;
          }
        }
      });

      cols.code.push('');
      cols.course.push(endMarkerText);
      cols.level.push('');
      cols.grade.push('');
      cols.cr.push('');
      cols.compul.push('');
      cols.year.push('');
      cols.month.push('');

      safeSetTextField('code', cols.code.join('\n'));
      safeSetTextField('course', cols.course.join('\n'));
      safeSetTextField('level', cols.level.join('\n'));
      safeSetTextField('grade', cols.grade.join('\n'));
      safeSetTextField('cr', cols.cr.join('\n'));
      safeSetTextField('compul', cols.compul.join('\n'));
      safeSetTextField('year', cols.year.join('\n'));
      safeSetTextField('month', cols.month.join('\n'));

      safeSetTextField('totalcr', totalCr.toFixed(2));
      safeSetTextField('totalcompul', totalCompul.toFixed(2));

      console.log(`总学分(totalcr): ${totalCr.toFixed(2)}`);
      console.log(`总必修学分(totalcompul): ${totalCompul.toFixed(2)}`);
    }

    console.log('表单字段填充完成');

    const pdfBytes = await pdfDoc.save();
    console.log('✅ EVA_FINAL_OST_26 PDF处理完成，输出大小:', pdfBytes.length);
    return Buffer.from(pdfBytes);

  } catch (error) {
    console.error('❌ EVA_FINAL_OST_26 PDF处理失败:', error);
    throw error;
  }
}
// ========================================
// 新增：填充OST课程数据的函数
// ========================================

async function fillOSTCourseData(courses, safeSetTextField) {
  console.log(`开始填充 ${courses.length} 门已完成课程的数据`);
  
  // 分离PLE课程和其他课程
  const pleCourses = courses.filter(course => course.course_code === 'PLE');
  const otherCourses = courses.filter(course => course.course_code !== 'PLE');
  
  console.log(`找到 ${pleCourses.length} 门PLE课程`);
  console.log(`找到 ${otherCourses.length} 门其他课程`);
  
  // 对其他课程按completion_date排序（从旧到新）
  otherCourses.sort((a, b) => {
    const dateA = new Date(a.completion_date || '1900-01-01');
    const dateB = new Date(b.completion_date || '1900-01-01');
    return dateA - dateB;
  });
  
  // 合并课程数组：PLE课程在前，其他课程按日期排序在后
  const sortedCourses = [...pleCourses, ...otherCourses];
  
  console.log('最终填充顺序:');
  sortedCourses.forEach((course, index) => {
    console.log(`  行${index + 1}: ${course.course_code} - ${course.completion_date}`);
  });

  // 辅助函数
  function parseCompletionDate(dateValue) {
    if (!dateValue) return { year: '', month: '' };
    
    let year = '';
    let month = '';
    
    if (dateValue instanceof Date) {
      year = dateValue.getFullYear().toString();
      month = (dateValue.getMonth() + 1).toString().padStart(2, '0');
    } else if (typeof dateValue === 'string') {
      const dateParts = dateValue.split('-');
      year = dateParts[0] || '';
      month = dateParts[1] || '';
    }
    
    return { year, month };
  }
  
  function formatYear(year, isLocal) {
    if (!year) return '';
    if (isLocal === 0 || isLocal === '0' || isLocal === false) {
      return `*${year}`;
    }
    return year;
  }
  
  function formatToTwoDecimals(value) {
    if (value === null || value === undefined || value === '') return '0.00';
    const num = parseFloat(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  }
  
  function formatCourseLevel(courseLevel) {
    if (!courseLevel) return '';
    const eslMatch = courseLevel.match(/^ESL(\d+)$/);
    if (eslMatch) {
      return eslMatch[1];
    }
    return courseLevel;
  }
  
  function formatCompulsory(isCompulsory) {
    if (isCompulsory === 1 || isCompulsory === true || isCompulsory === '1' || isCompulsory === 'Yes') {
      return 'X';
    }
    return '';
  }
  
  function formatGrade(grade, courseCode) {
    if (courseCode === 'PLE') {
      return 'EQV';
    }
    
    if (grade === null || grade === undefined || grade === '') return '';
    
    if (typeof grade === 'string' && /[a-zA-Z]/.test(grade)) {
      return grade;
    }
    
    const numGrade = parseFloat(grade);
    if (!isNaN(numGrade)) {
      return numGrade.toString();
    }
    
    return String(grade);
  }

  // 填充课程数据
  let totalCr = 0;
  let totalCompul = 0;
  
  sortedCourses.forEach((course, index) => {
    const rowIndex = index + 1;
    const dateInfo = parseCompletionDate(course.completion_date);
    
    if (course.course_code === 'PLE') {
      // PLE课程的特殊填充规则
      safeSetTextField(`code${rowIndex}`, course.course_code || '');
      safeSetTextField(`course${rowIndex}`, course.course_name || '');
      safeSetTextField(`level${rowIndex}`, '');
      safeSetTextField(`grade${rowIndex}`, 'EQV');
      safeSetTextField(`cr${rowIndex}`, formatToTwoDecimals(course.midterm_grade));
      safeSetTextField(`compul${rowIndex}`, formatToTwoDecimals(course.final_grade));
      safeSetTextField(`year${rowIndex}`, formatYear(dateInfo.year, course.is_local));
      safeSetTextField(`month${rowIndex}`, dateInfo.month);
      
      totalCr += parseFloat(course.midterm_grade) || 0;
      totalCompul += parseFloat(course.final_grade) || 0;
      
      console.log(`填充第 ${rowIndex} 行PLE课程数据: ${course.course_code}`);
    } else {
      // 普通课程的填充规则
      safeSetTextField(`code${rowIndex}`, course.course_code || '');
      safeSetTextField(`course${rowIndex}`, course.course_name || '');
      safeSetTextField(`level${rowIndex}`, formatCourseLevel(course.course_level));
      safeSetTextField(`grade${rowIndex}`, formatGrade(course.final_grade, course.course_code));
      safeSetTextField(`cr${rowIndex}`, formatToTwoDecimals(course.credit));
      safeSetTextField(`compul${rowIndex}`, formatCompulsory(course.is_compulsory));
      safeSetTextField(`year${rowIndex}`, formatYear(dateInfo.year, course.is_local));
      safeSetTextField(`month${rowIndex}`, dateInfo.month);
      
      totalCr += parseFloat(course.credit) || 0;
      if (formatCompulsory(course.is_compulsory) === 'X') {
        totalCompul += parseFloat(course.credit) || 0;
      }
      
      console.log(`填充第 ${rowIndex} 行课程数据: ${course.course_code}`);
    }
  });
  
  // 清空多余的行并添加结束标记
  const maxRows = 23;
  for (let i = sortedCourses.length + 1; i <= maxRows; i++) {
    if (i === sortedCourses.length + 1) {
      safeSetTextField(`code${i}`, '');
      safeSetTextField(`course${i}`, '                                *** Last Official Entry / Fin du relevés de notes ***');
      safeSetTextField(`level${i}`, '');
      safeSetTextField(`grade${i}`, '');
      safeSetTextField(`cr${i}`, '');
      safeSetTextField(`compul${i}`, '');
      safeSetTextField(`year${i}`, '');
      safeSetTextField(`month${i}`, '');
      console.log(`第 ${i} 行填充结束标记`);
    } else {
      safeSetTextField(`code${i}`, '');
      safeSetTextField(`course${i}`, '');
      safeSetTextField(`level${i}`, '');
      safeSetTextField(`grade${i}`, '');
      safeSetTextField(`cr${i}`, '');
      safeSetTextField(`compul${i}`, '');
      safeSetTextField(`year${i}`, '');
      safeSetTextField(`month${i}`, '');
    }
  }
  
  // 填充总计字段
  safeSetTextField('totalcr', totalCr.toFixed(2));
  safeSetTextField('totalcompul', totalCompul.toFixed(2));
  
  console.log(`总学分(totalcr): ${totalCr.toFixed(2)}`);
  console.log(`总必修学分(totalcompul): ${totalCompul.toFixed(2)}`);
}

// ========================================
// 新增：处理普通PDF的函数（保持原有OSR_Checklist.pdf的逻辑）
// ========================================

async function processGenericPdf(pdfDoc, form, studentData) {
  try {
    console.log('📋 处理普通PDF表单');
    
    // 获取所有表单域名称（用于调试）
    const fieldNames = form.getFields().map(field => field.getName());
    console.log('📋 PDF中的所有表单域:', fieldNames);
    
    // 准备填充数据
    const fullName = `${studentData.last_name || ''} ${studentData.first_name || ''}`.trim();
    const formattedOEN = formatStudentOEN(studentData.oen);
    
    console.log(`📝 准备填充数据: name="${fullName}", OEN="${formattedOEN}"`);
    
    // 填充name字段
    const possibleNameFields = ['name', 'Name', 'student_name', 'studentName', 'full_name', 'fullName'];
    let nameFieldFound = false;
    for (const fieldName of possibleNameFields) {
      try {
        const field = form.getTextField(fieldName);
        field.setText(fullName);
        console.log(`✅ 成功填充name字段 "${fieldName}": ${fullName}`);
        nameFieldFound = true;
        break;
      } catch (e) {
        // 继续尝试下一个字段名
      }
    }
    if (!nameFieldFound) {
      console.warn('⚠️ 未找到任何name相关字段');
    }
    
    // 填充OEN字段
    const possibleOenFields = ['OEN', 'oen', 'Oen', 'student_oen', 'studentOEN', 'ontario_education_number'];
    let oenFieldFound = false;
    for (const fieldName of possibleOenFields) {
      try {
        const field = form.getTextField(fieldName);
        field.setText(formattedOEN);
        console.log(`✅ 成功填充OEN字段 "${fieldName}": ${formattedOEN}`);
        oenFieldFound = true;
        break;
      } catch (e) {
        // 继续尝试下一个字段名
      }
    }
    if (!oenFieldFound) {
      console.warn('⚠️ 未找到任何OEN相关字段');
    }
    
    // 生成填充后的PDF字节数组
    const pdfBytes = await pdfDoc.save();
    console.log('✅ 普通PDF表单填充完成，输出大小:', pdfBytes.length);
    return Buffer.from(pdfBytes);
    
  } catch (error) {
    console.error('❌ 普通PDF表单处理失败:', error);
    throw error;
  }
}

// ========================================
// studentfile.html 相关功能结束
// ========================================

// 新增：批量生成相同文件类型给多个学生的API端点
app.post('/api/templates/generate-batch', async (req, res) => {
  const { files } = req.body;
  
  console.log(`📦 批量生成请求:`, files);
  
  try {
    if (!files || !Array.isArray(files) || files.length === 0) {
      console.error('❌ 无效的请求体:', req.body);
      return res.status(400).json({ error: '未选择文件或文件格式无效' });
    }
    
    // 验证所有文件使用相同的模板
    const templateFile = files[0].filename;
    const outputFormat = files[0].format;
    const allSameTemplate = files.every(file => file.filename === templateFile);
    
    if (!allSameTemplate) {
      return res.status(400).json({ error: '批量生成仅支持相同的模板文件' });
    }
    
    console.log(`📋 批量生成 ${files.length} 个文档，模板: ${templateFile}, 格式: ${outputFormat}`);
    
    // 检查模板文件是否存在
    const templatePath = path.join(__dirname, 'templates', templateFile);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: '模板文件不存在' });
    }
    
    // 创建ZIP压缩包
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });
    
    // 设置响应头
    const zipFileName = `Batch_${path.basename(templateFile, path.extname(templateFile))}_Documents.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
    
    console.log(`📦 开始创建批量ZIP文件: ${zipFileName}`);
    
    // 将archive连接到响应流
    archive.pipe(res);
    
    let processedFiles = 0;
    let totalFiles = 0;
    
    // 获取所有学生数据
    const oens = files.map(file => file.oen);
    const studentQuery = `
      SELECT student_id, oen, first_name, last_name, grade,
             birth_year, birth_month, birth_day,
             enrollment_year, enrollment_month, enrollment_day,
             expected_graduation_year, expected_graduation_month, expected_graduation_day
      FROM students 
      WHERE oen IN (${oens.map(() => '?').join(',')})
    `;
    
    db.query(studentQuery, oens, async (err, studentResults) => {
      if (err) {
        console.error('❌ 批量查询学生数据失败:', err);
        return res.status(500).json({ error: '查询学生数据失败' });
      }
      
      console.log(`✅ 找到 ${studentResults.length} 条学生数据`);
      
      if (studentResults.length === 0) {
        return res.status(404).json({ error: '未找到任何学生数据' });
      }
      
      try {
        // 处理每个学生的文档
        for (const fileInfo of files) {
          const studentData = studentResults.find(s => s.oen.toString() === fileInfo.oen.toString());
          
          if (!studentData) {
            console.warn(`⚠️ 未找到学生数据: OEN=${fileInfo.oen}`);
            continue;
          }
          
          console.log(`🔄 处理学生: ${studentData.first_name} ${studentData.last_name} (${studentData.oen})`);
          
          const isDocx = path.extname(templateFile).toLowerCase() === '.docx';
          const isPdf = path.extname(templateFile).toLowerCase() === '.pdf';
          
          try {
            if (isPdf) {
              // 处理PDF表单填充
              console.log(`📄 处理PDF表单文件: ${templateFile}`);
              const processedBuffer = await processPdfTemplate(templatePath, studentData);
              const newFileName = generateNewFileName(templateFile, studentData);
              archive.append(processedBuffer, { name: newFileName });
              totalFiles++;
              console.log(`✅ 已添加填充后的PDF文件到ZIP: ${newFileName}`);
              
            } else if (isDocx) {
              // 处理DOCX文件
              console.log(`📝 处理DOCX文件: ${templateFile}, 格式: ${outputFormat}`);
              
              const docxBuffer = await processDocxTemplate(templatePath, studentData);
              const baseFileName = generateNewFileName(templateFile, studentData);
              
              if (outputFormat === 'docx' || outputFormat === 'both' || !outputFormat) {
                archive.append(docxBuffer, { name: baseFileName });
                totalFiles++;
                console.log(`✅ 已添加DOCX文件到ZIP: ${baseFileName}`);
              }
              
              if (outputFormat === 'pdf' || outputFormat === 'both') {
                try {
                  const pdfBuffer = await convertAsync(docxBuffer, '.pdf', undefined);
                  const pdfFileName = baseFileName.replace('.docx', '.pdf');
                  archive.append(pdfBuffer, { name: pdfFileName });
                  totalFiles++;
                  console.log(`✅ 已添加PDF文件到ZIP: ${pdfFileName}`);
                } catch (pdfError) {
                  console.error(`❌ PDF转换失败 ${templateFile} for ${studentData.oen}:`, pdfError);
                  if (outputFormat === 'pdf') {
                    archive.append(docxBuffer, { name: baseFileName });
                    totalFiles++;
                    console.log(`⚠️ PDF转换失败，已添加DOCX版本: ${baseFileName}`);
                  }
                }
              }
              
            } else {
              // 其他类型文件，直接添加
              console.log(`📄 处理其他文件: ${templateFile}`);
              const fileBuffer = fs.readFileSync(templatePath);
              const newFileName = generateNewFileName(templateFile, studentData);
              archive.append(fileBuffer, { name: newFileName });
              totalFiles++;
              console.log(`✅ 已添加文件到ZIP: ${newFileName}`);
            }
            
            processedFiles++;
            
          } catch (fileError) {
            console.error(`❌ 处理学生文件失败 ${studentData.oen}:`, fileError);
            // 继续处理其他文件，不中断整个流程
          }
        }
        
        // 检查是否有文件被处理
        if (processedFiles === 0) {
          console.error('❌ 没有文件被成功处理');
          return res.status(400).json({ error: '没有有效的文件可以处理' });
        }
        
        console.log(`📊 批量处理完成: ${processedFiles} 个学生，生成 ${totalFiles} 个输出文件`);
        
        // 完成压缩
        await archive.finalize();
        
        console.log(`✅ 批量ZIP文件生成完成: ${zipFileName}`);
        
      } catch (processingError) {
        console.error('❌ 批量文件处理失败:', processingError);
        if (!res.headersSent) {
          res.status(500).json({ 
            error: '批量文件处理失败',
            details: processingError.message 
          });
        }
      }
    });
    
  } catch (error) {
    console.error('❌ 批量生成文件失败:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: '批量生成文件失败',
        details: error.message 
      });
    }
  }
});

// ========================================
// filegenerate.html 相关功能
// ========================================

app.post('/api/filegenerate/:filename/generate/:oen', async (req, res) => {
  const { filename, oen } = req.params;
  const { format } = req.body;
  
  console.log(`📝 FileGenerate - 生成文件请求: ${filename} for OEN: ${oen}, 格式: ${format}`);
  
  // 根据文件类型确定默认格式
  let actualFormat = format;
  if (!format) {
    if (filename.toLowerCase().endsWith('.docx')) {
      actualFormat = 'docx';
    } else if (filename.toLowerCase().endsWith('.pdf')) {
      actualFormat = 'original';
    } else {
      actualFormat = 'original';
    }
  }
  
  try {
    // 验证文件名安全性
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: '无效的文件名' });
    }
    
    // 检查文件是否存在
    const templatePath = path.join(__dirname, 'templates', filename);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: '模板文件不存在' });
    }
    
    // 获取学生数据
    const query = `
      SELECT student_id, oen, first_name, last_name, grade, student_number,
             birth_year, birth_month, birth_day,
             enrollment_year, enrollment_month, enrollment_day,
             expected_graduation_year, expected_graduation_month, expected_graduation_day
      FROM students 
      WHERE oen = ?
    `;
    
    db.query(query, [oen], async (err, results) => {
      if (err) {
        console.error('❌ 数据库查询失败:', err);
        return res.status(500).json({ error: '数据库查询失败' });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ error: '未找到学生数据' });
      }
      
      const studentData = results[0];
      console.log(`✅ 找到学生数据: ${studentData.first_name} ${studentData.last_name}`);
      
      try {
        const isDocx = path.extname(filename).toLowerCase() === '.docx';
        const isPdf = path.extname(filename).toLowerCase() === '.pdf';
        
        if (isPdf) {
          // 处理PDF表单填充
          const processedPdfBuffer = await processPdfTemplate(templatePath, studentData);
          const generatedFileName = generateNewFileName(filename, studentData);
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${generatedFileName}"`);
          res.setHeader('Content-Length', processedPdfBuffer.length);
          
          res.send(processedPdfBuffer);
          console.log(`✅ PDF表单填充文件生成成功: ${generatedFileName}`);
          
        } else if (isDocx) {
          // 处理DOCX文件
          if (actualFormat === 'both') {
            await generateBothFormats(res, templatePath, studentData, filename);
          } else if (actualFormat === 'pdf') {
            await generatePdfOnly(res, templatePath, studentData, filename);
          } else {
            await generateDocxOnly(res, templatePath, studentData, filename);
          }
        } else {
          // 其他文件类型，直接返回原文件
          const fileBuffer = fs.readFileSync(templatePath);
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.send(fileBuffer);
        }
        
      } catch (processingError) {
        console.error('❌ 文件处理失败:', processingError);
        if (!res.headersSent) {
          res.status(500).json({ 
            error: '文件处理失败',
            details: processingError.message 
          });
        }
      }
    });
    
  } catch (error) {
    console.error('❌ 生成文件失败:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: '生成文件失败',
        details: error.message 
      });
    }
  }
});

// 新增：filegenerate专用 - 批量生成同一个文件给多个学生的API端点
app.post('/api/filegenerate/generate-batch', async (req, res) => {
  const { files } = req.body;
  
  console.log(`📦 FileGenerate - 批量生成请求:`, files);
  
  try {
    if (!files || !Array.isArray(files) || files.length === 0) {
      console.error('❌ 无效的请求体:', req.body);
      return res.status(400).json({ error: '未选择文件或文件格式无效' });
    }
    
    // 验证所有文件使用相同的模板
    const templateFile = files[0].filename;
    const outputFormat = files[0].format;
    const allSameTemplate = files.every(file => file.filename === templateFile);
    
    if (!allSameTemplate) {
      return res.status(400).json({ error: '批量生成仅支持相同的模板文件' });
    }
    
    console.log(`📋 批量生成 ${files.length} 个文档，模板: ${templateFile}, 格式: ${outputFormat}`);
    
    // 检查模板文件是否存在
    const templatePath = path.join(__dirname, 'templates', templateFile);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: '模板文件不存在' });
    }
    
    // 创建ZIP压缩包
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });
    
    // 设置响应头
    const zipFileName = `Batch_${path.basename(templateFile, path.extname(templateFile))}_Documents.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
    
    console.log(`📦 开始创建批量ZIP文件: ${zipFileName}`);
    
    // 将archive连接到响应流
    archive.pipe(res);
    
    let processedFiles = 0;
    let totalFiles = 0;
    
    // 获取所有学生数据
    const oens = files.map(file => file.oen);
    const studentQuery = `
      SELECT student_id, oen, first_name, last_name, grade, student_number,
             birth_year, birth_month, birth_day,
             enrollment_year, enrollment_month, enrollment_day,
             expected_graduation_year, expected_graduation_month, expected_graduation_day
      FROM students 
      WHERE oen IN (${oens.map(() => '?').join(',')})
    `;
    
    db.query(studentQuery, oens, async (err, studentResults) => {
      if (err) {
        console.error('❌ 批量查询学生数据失败:', err);
        return res.status(500).json({ error: '查询学生数据失败' });
      }
      
      console.log(`✅ 找到 ${studentResults.length} 条学生数据`);
      
      if (studentResults.length === 0) {
        return res.status(404).json({ error: '未找到任何学生数据' });
      }
      
      try {
        // 处理每个学生的文档
        for (const fileInfo of files) {
          const studentData = studentResults.find(s => s.oen.toString() === fileInfo.oen.toString());
          
          if (!studentData) {
            console.warn(`⚠️ 未找到学生数据: OEN=${fileInfo.oen}`);
            continue;
          }
          
          console.log(`🔄 处理学生: ${studentData.first_name} ${studentData.last_name} (${studentData.oen})`);
          
          const isDocx = path.extname(templateFile).toLowerCase() === '.docx';
          const isPdf = path.extname(templateFile).toLowerCase() === '.pdf';
          
          try {
            if (isPdf) {
              // 处理PDF表单填充
              console.log(`📄 处理PDF表单文件: ${templateFile}`);
              const processedBuffer = await processPdfTemplate(templatePath, studentData);
              const newFileName = generateNewFileName(templateFile, studentData);
              archive.append(processedBuffer, { name: newFileName });
              totalFiles++;
              console.log(`✅ 已添加填充后的PDF文件到ZIP: ${newFileName}`);
              
            } else if (isDocx) {
              // 处理DOCX文件
              console.log(`📝 处理DOCX文件: ${templateFile}, 格式: ${outputFormat}`);
              
              const docxBuffer = await processDocxTemplate(templatePath, studentData);
              const baseFileName = generateNewFileName(templateFile, studentData);
              
              if (outputFormat === 'docx' || outputFormat === 'both' || !outputFormat) {
                archive.append(docxBuffer, { name: baseFileName });
                totalFiles++;
                console.log(`✅ 已添加DOCX文件到ZIP: ${baseFileName}`);
              }
              
              if (outputFormat === 'pdf' || outputFormat === 'both') {
                try {
                  const pdfBuffer = await convertAsync(docxBuffer, '.pdf', undefined);
                  const pdfFileName = baseFileName.replace('.docx', '.pdf');
                  archive.append(pdfBuffer, { name: pdfFileName });
                  totalFiles++;
                  console.log(`✅ 已添加PDF文件到ZIP: ${pdfFileName}`);
                } catch (pdfError) {
                  console.error(`❌ PDF转换失败 ${templateFile} for ${studentData.oen}:`, pdfError);
                  if (outputFormat === 'pdf') {
                    archive.append(docxBuffer, { name: baseFileName });
                    totalFiles++;
                    console.log(`⚠️ PDF转换失败，已添加DOCX版本: ${baseFileName}`);
                  }
                }
              }
              
            } else {
              // 其他类型文件，直接添加
              console.log(`📄 处理其他文件: ${templateFile}`);
              const fileBuffer = fs.readFileSync(templatePath);
              const newFileName = generateNewFileName(templateFile, studentData);
              archive.append(fileBuffer, { name: newFileName });
              totalFiles++;
              console.log(`✅ 已添加文件到ZIP: ${newFileName}`);
            }
            
            processedFiles++;
            
          } catch (fileError) {
            console.error(`❌ 处理学生文件失败 ${studentData.oen}:`, fileError);
            // 继续处理其他文件，不中断整个流程
          }
        }
        
        // 检查是否有文件被处理
        if (processedFiles === 0) {
          console.error('❌ 没有文件被成功处理');
          return res.status(400).json({ error: '没有有效的文件可以处理' });
        }
        
        console.log(`📊 批量处理完成: ${processedFiles} 个学生，生成 ${totalFiles} 个输出文件`);
        
        // 完成压缩
        await archive.finalize();
        
        console.log(`✅ 批量ZIP文件生成完成: ${zipFileName}`);
        
      } catch (processingError) {
        console.error('❌ 批量文件处理失败:', processingError);
        if (!res.headersSent) {
          res.status(500).json({ 
            error: '批量文件处理失败',
            details: processingError.message 
          });
        }
      }
    });
    
  } catch (error) {
    console.error('❌ 批量生成文件失败:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: '批量生成文件失败',
        details: error.message 
      });
    }
  }
});

// =========================================
// filegenerate.html 相关功能结束
// =========================================

// ========================================
// studentallcourse.html 相关功能
// ========================================
// -----特殊处理PLAR课程
// API端点：根据OEN获取学生PLAR信息
app.get('/api/student/:oen/plar', (req, res) => {
 const oen = req.params.oen.replace(/-/g, ''); // 移除连字符
 console.log(`📋 收到获取学生PLAR信息请求，OEN: ${oen}`);
  
 // 首先根据OEN获取student_id
 const getStudentIdQuery = `
   SELECT student_id, first_name, last_name
   FROM students
   WHERE oen = ?
 `;

 db.query(getStudentIdQuery, [oen], (err, studentResults) => {
   if (err) {
     console.error('❌ 查询学生ID失败：', err);
     res.status(500).json({
       error: '获取学生ID失败',
       details: err.message
     });
     return;
   }

   if (studentResults.length === 0) {
     console.log('⚠️ 未找到该学生');
     res.status(404).json({ error: '未找到该学生' });
     return;
   }

   const studentId = studentResults[0].student_id;
   const studentName = `${studentResults[0].first_name} ${studentResults[0].last_name}`;
   console.log(`✅ 找到学生ID: ${studentId}, 姓名: ${studentName}`);

   // 查询该学生是否有PLE课程记录
   const getPLEQuery = `
     SELECT 
       course_code,
       is_local,
       completion_date,
       midterm_grade,
       final_grade
     FROM student_courses
     WHERE student_id = ? AND course_code = 'PLE'
   `;

   db.query(getPLEQuery, [studentId], (err, pleResults) => {
     if (err) {
       console.error('❌ 查询PLE课程失败：', err);
       res.status(500).json({
         error: '获取PLE课程信息失败',
         details: err.message
       });
       return;
     }

     let plarData;

     if (pleResults.length === 0) {
       // 没有PLE记录
       console.log('⚠️ 该学生没有PLE课程记录');
       plarData = {
         hasPLAR: false,
         isEvaluated: 'N/A',
         evaluationDate: 'N/A',
         totalCredits: 'N/A',
         compulsoryCredits: 'N/A',
         studentName: studentName
       };
     } else {
       // 有PLE记录
       const pleRecord = pleResults[0];
       console.log('✅ 找到PLE课程记录:', pleRecord);
       
       // 格式化完成日期
       let completionDate = 'N/A';
       if (pleRecord.completion_date) {
         const date = new Date(pleRecord.completion_date);
         completionDate = date.toISOString().split('T')[0]; // 格式化为 YYYY-MM-DD
       }

       plarData = {
         hasPLAR: true,
         isEvaluated: pleRecord.is_local === 1 ? 'Yes' : 'No',
         evaluationDate: completionDate,
         totalCredits: pleRecord.midterm_grade || 'N/A',
         compulsoryCredits: pleRecord.final_grade || 'N/A',
         studentName: studentName
       };
     }

     console.log('📊 返回PLAR数据:', plarData);
     res.json(plarData);
   });
 });
});
// -----特殊处理PLAR课程结束

// -----处理剩下的课程的view mode
// API端点：根据OEN获取学生的所有课程（除了PLE）
app.get('/api/student/:oen/courses', (req, res) => {
   const oen = req.params.oen.replace(/-/g, ''); // 移除连字符
   console.log(`📚 收到获取学生课程请求，OEN: ${oen}`);
    
   // 首先根据OEN获取student_id
   const getStudentIdQuery = `
     SELECT student_id, first_name, last_name
     FROM students
     WHERE oen = ?
   `;

   db.query(getStudentIdQuery, [oen], (err, studentResults) => {
     if (err) {
       console.error('❌ 查询学生ID失败：', err);
       res.status(500).json({
         error: '获取学生ID失败',
         details: err.message
       });
       return;
     }

     if (studentResults.length === 0) {
       console.log('⚠️ 未找到该学生');
       res.status(404).json({ error: '未找到该学生' });
       return;
     }

     const studentId = studentResults[0].student_id;
     const studentName = `${studentResults[0].first_name} ${studentResults[0].last_name}`;
     console.log(`✅ 找到学生ID: ${studentId}, 姓名: ${studentName}`);

     // 查询该学生的所有课程记录（除了PLE）
     const getCoursesQuery = `
       SELECT 
         course_code,
         status,
         start_year,
         start_month,
         start_day,
         completion_date,
         midterm_grade,
         final_grade,
         is_local,
         is_compulsory
       FROM student_courses
       WHERE student_id = ? AND course_code != 'PLE'
       ORDER BY start_year DESC, start_month DESC, start_day DESC
     `;

     db.query(getCoursesQuery, [studentId], (err, courseResults) => {
       if (err) {
         console.error('❌ 查询学生课程失败：', err);
         res.status(500).json({
           error: '获取学生课程信息失败',
           details: err.message
         });
         return;
       }

       console.log(`✅ 找到 ${courseResults.length} 门课程`);
       
       // 处理课程数据，格式化日期
       const processedCourses = courseResults.map(course => {
         let completionDate = null;
         if (course.completion_date) {
           const date = new Date(course.completion_date);
           completionDate = date.toISOString().split('T')[0]; // 格式化为 YYYY-MM-DD
         }
         
         return {
           ...course,
           completion_date: completionDate,
           studentName: studentName
         };
       });

       console.log('📊 返回课程数据:', processedCourses.length, '门课程');
       res.json(processedCourses);
     });
   });
});

// API端点：删除学生的特定课程
app.delete('/api/student/:oen/course/:courseCode', (req, res) => {
   const oen = req.params.oen.replace(/-/g, ''); // 移除连字符
   const courseCode = req.params.courseCode;
   console.log(`🗑️ 收到删除课程请求，OEN: ${oen}, Course: ${courseCode}`);
    
   // 首先根据OEN获取student_id
   const getStudentIdQuery = `
     SELECT student_id
     FROM students
     WHERE oen = ?
   `;

   db.query(getStudentIdQuery, [oen], (err, studentResults) => {
     if (err) {
       console.error('❌ 查询学生ID失败：', err);
       res.status(500).json({
         error: '获取学生ID失败',
         details: err.message
       });
       return;
     }

     if (studentResults.length === 0) {
       console.log('⚠️ 未找到该学生');
       res.status(404).json({ error: '未找到该学生' });
       return;
     }

     const studentId = studentResults[0].student_id;
     console.log(`✅ 找到学生ID: ${studentId}`);

     // 删除指定课程记录
     const deleteCourseQuery = `
       DELETE FROM student_courses
       WHERE student_id = ? AND course_code = ?
     `;

     db.query(deleteCourseQuery, [studentId, courseCode], (err, deleteResult) => {
       if (err) {
         console.error('❌ 删除课程失败：', err);
         res.status(500).json({
           error: '删除课程失败',
           details: err.message
         });
         return;
       }

       if (deleteResult.affectedRows === 0) {
         console.log('⚠️ 未找到要删除的课程');
         res.status(404).json({ error: '未找到要删除的课程' });
         return;
       }

       console.log(`✅ 成功删除课程 ${courseCode}`);
       res.json({ 
         success: true, 
         message: `课程 ${courseCode} 删除成功`,
         affectedRows: deleteResult.affectedRows 
       });
     });
   });
});
// -----处理剩下的课程的view mode结束

// // -----处理编辑PLAR信息

// 在现有的PLAR相关API后添加以下代码
// 在server.js中现有API后添加这个端点
// API端点：根据OEN获取学生详情
app.get('/api/student/:oen', (req, res) => {
  const oen = req.params.oen.replace(/-/g, ''); // 移除连字符
  console.log(`📋 收到获取学生详情请求，OEN: ${oen}`);
  
  const getStudentQuery = `
    SELECT student_id, first_name, last_name, oen
    FROM students
    WHERE oen = ?
  `;

  db.query(getStudentQuery, [oen], (err, results) => {
    if (err) {
      console.error('❌ 查询学生详情失败：', err);
      res.status(500).json({
        error: '获取学生详情失败',
        details: err.message
      });
      return;
    }

    if (results.length === 0) {
      console.log('⚠️ 未找到该学生');
      res.status(404).json({ error: '未找到该学生' });
      return;
    }

    const student = results[0];
    console.log(`✅ 成功获取学生详情: ${student.first_name} ${student.last_name}`);
    
    res.json({
      studentId: student.student_id,
      firstName: student.first_name,
      lastName: student.last_name,
      oen: formatOEN(student.oen)
    });
  });
});

// API端点：更新学生PLAR信息
app.put('/api/student/:oen/plar', (req, res) => {
  const oen = req.params.oen.replace(/-/g, ''); // 移除连字符
  const { hasPLAR, isEvaluated, evaluationDate, totalCredits, compulsoryCredits } = req.body;
  console.log(`📝 收到更新学生PLAR信息请求，OEN: ${oen}`, req.body);
  
  // 首先根据OEN获取student_id
  const getStudentIdQuery = `
    SELECT student_id
    FROM students
    WHERE oen = ?
  `;

  db.query(getStudentIdQuery, [oen], (err, studentResults) => {
    if (err) {
      console.error('❌ 查询学生ID失败：', err);
      res.status(500).json({
        error: '获取学生ID失败',
        details: err.message
      });
      return;
    }

    if (studentResults.length === 0) {
      console.log('⚠️ 未找到该学生');
      res.status(404).json({ error: '未找到该学生' });
      return;
    }

    const studentId = studentResults[0].student_id;
    console.log(`✅ 找到学生ID: ${studentId}`);

    if (!hasPLAR) {
      // 如果用户选择No，删除PLE课程记录
      deletePLECourse(studentId, res);
    } else {
      // 如果用户选择Yes，创建或更新PLE课程记录
      upsertPLECourse(studentId, isEvaluated, evaluationDate, totalCredits, compulsoryCredits, res);
    }
  });
});

// 删除PLE课程记录
function deletePLECourse(studentId, res) {
  const deletePLEQuery = `
    DELETE FROM student_courses
    WHERE student_id = ? AND course_code = 'PLE'
  `;

  db.query(deletePLEQuery, [studentId], (err, deleteResult) => {
    if (err) {
      console.error('❌ 删除PLE课程失败：', err);
      res.status(500).json({
        error: '删除PLE课程失败',
        details: err.message
      });
      return;
    }

    console.log(`✅ 成功删除PLE课程记录`);
    res.json({ 
      success: true, 
      message: 'PLAR信息已更新',
      action: 'deleted'
    });
  });
}

// 创建或更新PLE课程记录
function upsertPLECourse(studentId, isEvaluated, evaluationDate, totalCredits, compulsoryCredits, res) {
  console.log('🔄 开始创建或更新PLE记录:', {
    studentId,
    isEvaluated,
    evaluationDate,
    totalCredits,
    compulsoryCredits
  });  
  
  // 月份转换函数
  function convertMonthToString(monthNum) {
    const months = {
      '01': 'JAN', '02': 'FEB', '03': 'MAR', '04': 'APR',
      '05': 'MAY', '06': 'JUN', '07': 'JUL', '08': 'AUG',
      '09': 'SEP', '10': 'OCT', '11': 'NOV', '12': 'DEC'
    };
    return months[monthNum] || 'JAN';
  }

  // 解析日期
  let startYear = null, startMonth = null, startDay = null;
  let completionDate = null, reportCardDate = null;
  
  if (evaluationDate && evaluationDate.trim() !== '' && evaluationDate !== 'N/A') {
    const dateParts = evaluationDate.split('-');
    if (dateParts.length === 3) {
      startYear = parseInt(dateParts[0]);
      startMonth = convertMonthToString(dateParts[1]);
      startDay = parseInt(dateParts[2]);
      completionDate = evaluationDate;
      reportCardDate = evaluationDate;
    }
  }

  const isLocal = isEvaluated === 'Yes' ? 1 : 0;

  // 修复：处理空值和N/A值
  const processedTotalCredits = (totalCredits && totalCredits.trim() !== '' && totalCredits !== 'N/A') ? totalCredits.trim() : null;
  const processedCompulsoryCredits = (compulsoryCredits && compulsoryCredits.trim() !== '' && compulsoryCredits !== 'N/A') ? compulsoryCredits.trim() : null;

  console.log('📊 处理后的数据:', {
    isLocal,
    startYear,
    startMonth,
    startDay,
    completionDate,
    processedTotalCredits,
    processedCompulsoryCredits
  });


  // 检查PLE课程是否已存在
  const checkPLEQuery = `
    SELECT id FROM student_courses
    WHERE student_id = ? AND course_code = 'PLE'
  `;

  db.query(checkPLEQuery, [studentId], (err, existingResults) => {
    if (err) {
      console.error('❌ 检查PLE课程失败：', err);
      res.status(500).json({
        error: '检查PLE课程失败',
        details: err.message
      });
      return;
    }

    if (existingResults.length > 0) {
      // 更新现有记录
      const updatePLEQuery = `
        UPDATE student_courses
        SET 
          status = 'COMPLETED',
          is_compulsory = 0,
          is_local = ?,
          start_year = ?,
          start_month = ?,
          start_day = ?,
          completion_date = ?,
          report_card_date = ?,
          midterm_grade = ?,
          final_grade = ?
        WHERE student_id = ? AND course_code = 'PLE'
      `;

      const updateParams = [
        isLocal,
        startYear,
        startMonth,
        startDay,
        completionDate,
        reportCardDate,
        totalCredits || null,
        compulsoryCredits || null,
        studentId
      ];

      console.log('🔧 更新参数:', updateParams);

      db.query(updatePLEQuery, updateParams, (err, updateResult) => {
        if (err) {
          console.error('❌ 更新PLE课程失败：', err);
          res.status(500).json({
            error: '更新PLE课程失败',
            details: err.message
          });
          return;
        }

        console.log(`✅ 成功更新PLE课程记录`);
        res.json({ 
          success: true, 
          message: 'PLAR信息已更新',
          action: 'updated'
        });
      });
    } else {
      // 插入新记录
      const insertPLEQuery = `
        INSERT INTO student_courses (
          student_id, course_code, status, is_compulsory, is_local,
          start_year, start_month, start_day, completion_date, report_card_date,
          midterm_grade, final_grade
        ) VALUES (?, 'PLE', 'COMPLETED', 0, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const insertParams = [
        studentId,
        isLocal,
        startYear,
        startMonth,
        startDay,
        completionDate,
        reportCardDate,
        totalCredits || null,
        compulsoryCredits || null
      ];

      db.query(insertPLEQuery, insertParams, (err, insertResult) => {
        if (err) {
          console.error('❌ 插入PLE课程失败：', err);
          res.status(500).json({
            error: '插入PLE课程失败',
            details: err.message
          });
          return;
        }

        console.log(`✅ 成功插入PLE课程记录`);
        res.json({ 
          success: true, 
          message: 'PLAR信息已更新',
          action: 'inserted'
        });
      });
    }
  });
}

// -----处理编辑PLAR信息结束

// ========== 修改课程
// 在 server.js 文件中的 studentallcourse.html 相关功能部分添加以下API端点：

// API端点：批量更新学生课程信息
app.put('/api/student/:oen/courses', (req, res) => {
  const oen = req.params.oen.replace(/-/g, ''); // 移除连字符
  const { courses } = req.body;
  console.log(`📝 收到批量更新学生课程请求，OEN: ${oen}`, courses);
  
  // 首先根据OEN获取student_id
  const getStudentIdQuery = `
    SELECT student_id
    FROM students
    WHERE oen = ?
  `;

  db.query(getStudentIdQuery, [oen], (err, studentResults) => {
    if (err) {
      console.error('❌ 查询学生ID失败：', err);
      res.status(500).json({
        error: '获取学生ID失败',
        details: err.message
      });
      return;
    }

    if (studentResults.length === 0) {
      console.log('⚠️ 未找到该学生');
      res.status(404).json({ error: '未找到该学生' });
      return;
    }

    const studentId = studentResults[0].student_id;
    console.log(`✅ 找到学生ID: ${studentId}`);

    // 开始事务处理
    db.beginTransaction((err) => {
      if (err) {
        console.error('❌ 开始事务失败：', err);
        res.status(500).json({
          error: '开始事务失败',
          details: err.message
        });
        return;
      }

      // 处理每个课程更新
      let processedCount = 0;
      let hasError = false;

      if (courses.length === 0) {
        db.commit((err) => {
          if (err) {
            console.error('❌ 提交事务失败：', err);
            res.status(500).json({
              error: '提交事务失败',
              details: err.message
            });
            return;
          }
          res.json({ success: true, message: '没有课程需要更新' });
        });
        return;
      }

      courses.forEach((course, index) => {
        if (hasError) return;

        updateSingleCourse(studentId, course, (error) => {
          if (error) {
            hasError = true;
            console.error('❌ 更新课程失败：', error);
            db.rollback(() => {
              res.status(500).json({
                error: '更新课程失败',
                details: error.message
              });
            });
            return;
          }

          processedCount++;
          
          // 如果所有课程都处理完毕
          if (processedCount === courses.length) {
            db.commit((err) => {
              if (err) {
                console.error('❌ 提交事务失败：', err);
                db.rollback(() => {
                  res.status(500).json({
                    error: '提交事务失败',
                    details: err.message
                  });
                });
                return;
              }
              
              console.log(`✅ 成功更新 ${processedCount} 门课程`);
              res.json({ 
                success: true, 
                message: `成功更新 ${processedCount} 门课程`,
                updatedCount: processedCount
              });
            });
          }
        });
      });
    });
  });
});

// 辅助函数：更新单个课程记录
function updateSingleCourse(studentId, courseData, callback) {
  console.log('更新单个课程:', courseData);
  
  // 转换状态
  const statusMap = {
    'Course In Progress': 'IN_PROGRESS',
    'Course Completed': 'COMPLETED',
    'Course Withdrawn': 'WITHDRAWN'
  };
  const dbStatus = statusMap[courseData.status] || courseData.status;
  
  // 转换是否本地和必修课程
  const isLocal = courseData.local === 'Yes' ? 1 : 0;
  const isCompulsory = courseData.compulsory === 'Yes' ? 1 : 0;
  
  // 处理注册日期
  let startYear = null, startMonth = null, startDay = null;
  if (courseData.enrollmentDate) {
    const dateParts = courseData.enrollmentDate.split('-');
    if (dateParts.length === 3) {
      startYear = parseInt(dateParts[0]);
      startMonth = convertMonthToString(dateParts[1]);
      startDay = parseInt(dateParts[2]);
    }
  }
  
  // 处理完成日期
  let completionDate = null, reportCardDate = null;
  if (courseData.completionDate) {
    completionDate = courseData.completionDate;
    reportCardDate = courseData.completionDate;
  }
  
  // 处理成绩（空字符串转为null）
  const midtermGrade = courseData.midtermGrade.trim() || null;
  const finalGrade = courseData.finalGrade.trim() || null;
  
  // 如果课程代码发生变化，需要先检查新课程代码是否已存在
  if (courseData.originalCourseCode !== courseData.courseCode) {
    const checkExistingQuery = `
      SELECT id FROM student_courses
      WHERE student_id = ? AND course_code = ? AND course_code != ?
    `;
    
    db.query(checkExistingQuery, [studentId, courseData.courseCode, courseData.originalCourseCode], (err, results) => {
      if (err) {
        callback(err);
        return;
      }
      
      if (results.length > 0) {
        callback(new Error(`课程代码 ${courseData.courseCode} 已存在`));
        return;
      }
      
      // 执行更新
      performUpdate();
    });
  } else {
    // 执行更新
    performUpdate();
  }
  
  function performUpdate() {
    const updateQuery = `
      UPDATE student_courses
      SET 
        course_code = ?,
        status = ?,
        start_year = ?,
        start_month = ?,
        start_day = ?,
        completion_date = ?,
        report_card_date = ?,
        is_local = ?,
        is_compulsory = ?,
        midterm_grade = ?,
        final_grade = ?
      WHERE student_id = ? AND course_code = ?
    `;
    
    const updateParams = [
      courseData.courseCode,
      dbStatus,
      startYear,
      startMonth,
      startDay,
      completionDate,
      reportCardDate,
      isLocal,
      isCompulsory,
      midtermGrade,
      finalGrade,
      studentId,
      courseData.originalCourseCode
    ];
    
    db.query(updateQuery, updateParams, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      
      if (result.affectedRows === 0) {
        callback(new Error(`未找到课程 ${courseData.originalCourseCode}`));
        return;
      }
      
      console.log(`✅ 成功更新课程 ${courseData.originalCourseCode} -> ${courseData.courseCode}`);
      callback(null);
    });
  }
}

// 辅助函数：月份数字转换为字母简写
function convertMonthToString(monthNum) {
  const months = {
    '01': 'JAN', '02': 'FEB', '03': 'MAR', '04': 'APR',
    '05': 'MAY', '06': 'JUN', '07': 'JUL', '08': 'AUG',
    '09': 'SEP', '10': 'OCT', '11': 'NOV', '12': 'DEC'
  };
  return months[monthNum] || 'JAN';
}
// ========== 修改课程结束

// 添加新的课程

// 在 studentallcourse.html 相关功能部分添加以下API端点：

// API端点：为学生添加新课程
app.post('/api/student/:oen/course', (req, res) => {
  const oen = req.params.oen.replace(/-/g, ''); // 移除连字符
  const courseData = req.body;
  console.log(`➕ 收到添加新课程请求，OEN: ${oen}`, courseData);
  
  // 首先根据OEN获取student_id
  const getStudentIdQuery = `
    SELECT student_id
    FROM students
    WHERE oen = ?
  `;

  db.query(getStudentIdQuery, [oen], (err, studentResults) => {
    if (err) {
      console.error('❌ 查询学生ID失败：', err);
      res.status(500).json({
        error: '获取学生ID失败',
        details: err.message
      });
      return;
    }

    if (studentResults.length === 0) {
      console.log('⚠️ 未找到该学生');
      res.status(404).json({ error: '未找到该学生' });
      return;
    }

    const studentId = studentResults[0].student_id;
    console.log(`✅ 找到学生ID: ${studentId}`);

    // 检查课程代码是否已存在
    const checkCourseQuery = `
      SELECT id FROM student_courses
      WHERE student_id = ? AND course_code = ?
    `;

    db.query(checkCourseQuery, [studentId, courseData.courseCode], (err, existingResults) => {
      if (err) {
        console.error('❌ 检查课程代码失败：', err);
        res.status(500).json({
          error: '检查课程代码失败',
          details: err.message
        });
        return;
      }

      if (existingResults.length > 0) {
        console.log('⚠️ 课程代码已存在');
        res.status(400).json({ error: `课程代码 ${courseData.courseCode} 已存在` });
        return;
      }

      // 插入新课程记录
      insertNewCourse(studentId, courseData, res);
    });
  });
});

// 辅助函数：插入新课程记录
function insertNewCourse(studentId, courseData, res) {
  console.log('插入新课程记录:', courseData);
  
  // 转换状态
  const statusMap = {
    'Course In Progress': 'IN_PROGRESS',
    'Course Completed': 'COMPLETED',
    'Course Withdrawn': 'WITHDRAWN'
  };
  const dbStatus = statusMap[courseData.status] || courseData.status;
  
  // 转换是否本地和必修课程
  const isLocal = courseData.local === 'Yes' ? 1 : 0;
  const isCompulsory = courseData.compulsory === 'Yes' ? 1 : 0;
  
  // 处理注册日期
  let startYear = null, startMonth = null, startDay = null;
  if (courseData.enrollmentDate) {
    const dateParts = courseData.enrollmentDate.split('-');
    if (dateParts.length === 3) {
      startYear = parseInt(dateParts[0]);
      startMonth = convertMonthToString(dateParts[1]);
      startDay = parseInt(dateParts[2]);
    }
  }
  
  // 处理完成日期
  let completionDate = null, reportCardDate = null;
  if (courseData.completionDate) {
    completionDate = courseData.completionDate;
    reportCardDate = courseData.completionDate;
  }
  
  // 处理成绩（null值处理）
  const midtermGrade = courseData.midtermGrade || null;
  const finalGrade = courseData.finalGrade || null;
  
  const insertQuery = `
    INSERT INTO student_courses (
      student_id, course_code, status, is_compulsory, is_local,
      start_year, start_month, start_day, completion_date, report_card_date,
      midterm_grade, final_grade
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const insertParams = [
    studentId,
    courseData.courseCode,
    dbStatus,
    isCompulsory,
    isLocal,
    startYear,
    startMonth,
    startDay,
    completionDate,
    reportCardDate,
    midtermGrade,
    finalGrade
  ];
  
  db.query(insertQuery, insertParams, (err, insertResult) => {
    if (err) {
      console.error('❌ 插入新课程失败：', err);
      res.status(500).json({
        error: '插入新课程失败',
        details: err.message
      });
      return;
    }
    
    console.log(`✅ 成功插入新课程 ${courseData.courseCode}`);
    res.json({ 
      success: true, 
      message: `课程 ${courseData.courseCode} 添加成功`,
      courseId: insertResult.insertId
    });
  });
}
//添加新的课程结束
// ========================================
// studentallcourse.html 相关功能结束
// ========================================



// ========================================
// student final ost相关功能
// ========================================
//填充pdf FinalOST.pdf- 修改后的版本 (PLE优先 + 日期排序 + 添加student_number + 修复bugs)
app.get('/generate-pdf/:oen', async (req, res) => {
  const oen = req.params.oen;
  console.log('Received PDF generation request for OEN:', oen);

  // 第一个查询：获取学生基本信息（添加student_number和expected_graduation_year、expected_graduation_month字段）
  const studentQuery = `
    SELECT student_id, last_name, first_name, OEN, student_number,
      birth_year, birth_month, birth_day,
      enrollment_year, enrollment_month, enrollment_day,
      expected_graduation_year, expected_graduation_month
    FROM students
    WHERE OEN = ?;
  `;

  db.query(studentQuery, [oen], async (err, studentResults) => {
    if (err) {
      console.error('数据库查询失败:', err);
      return res.status(500).json({ error: '数据库查询失败' });
    }
    if (studentResults.length === 0) {
      console.log('未找到OEN为', oen, '的学生');
      return res.status(404).json({ error: '找不到该学生' });
    }

    const student = studentResults[0];
    console.log('找到学生:', student);

    // 第二个查询：三表关联查询获取完整的课程信息（修正后）
    const coursesQuery = `
      SELECT 
        sc.student_id,
        sc.course_code,
        sc.final_grade,
        sc.midterm_grade,
        sc.completion_date,
        sc.is_compulsory,
        sc.is_local,
        sc.status,
        c.course_name,
        c.credit,
        c.course_level
      FROM student_courses sc
      LEFT JOIN courses c ON sc.course_code = c.course_code
      WHERE sc.student_id = ? AND sc.status = 'COMPLETED'
    `;

    db.query(coursesQuery, [student.student_id], async (coursesErr, coursesResults) => {
      if (coursesErr) {
        console.error('查询课程信息失败:', coursesErr);
        return res.status(500).json({ error: '查询课程信息失败' });
      }

      console.log('找到已完成的课程记录:', coursesResults.length, '条');

      try {
        // 读入已经带表单的PDF模板
        const templatePath = path.join(__dirname, 'templates', 'FinalOST.pdf');
        
        // 检查模板文件是否存在
        if (!fs.existsSync(templatePath)) {
          console.error('PDF模板文件不存在:', templatePath);
          return res.status(500).json({ error: 'PDF模板文件不存在' });
        }
        
        console.log('正在读取PDF模板文件:', templatePath);
        const existingPdfBytes = fs.readFileSync(templatePath);

        // 加载PDF
        console.log('正在加载PDF文档...');
        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        // 获取表单
        console.log('正在获取PDF表单...');
        const form = pdfDoc.getForm();
        
        // 获取所有表单字段名，用于调试
        const fieldNames = form.getFields().map(field => field.getName());
        console.log('PDF中可用的表单字段:', fieldNames);

        // 安全填充表单字段的辅助函数
        function safeSetTextField(fieldName, value) {
          try {
            const field = form.getTextField(fieldName);
            if (field) {
              // 确保value是字符串类型
              const stringValue = value !== null && value !== undefined ? String(value) : '';
              field.setText(stringValue);
              console.log(`成功填充字段 ${fieldName}: ${stringValue}`);
            } else {
              console.warn(`字段 ${fieldName} 不存在`);
            }
          } catch (error) {
            console.error(`填充字段 ${fieldName} 时出错:`, error.message);
            // 尝试查找相似的字段名
            const similarFields = fieldNames.filter(name => 
              name.toLowerCase().includes(fieldName.toLowerCase()) || 
              fieldName.toLowerCase().includes(name.toLowerCase())
            );
            if (similarFields.length > 0) {
              console.log(`可能的相似字段: ${similarFields.join(', ')}`);
            }
          }
        }

        //转换月份字母对数字
        function convertMonthToNumber(monthAbbr) {
          const monthMap = {
            'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
            'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
            'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
          };
          return monthMap[monthAbbr?.toUpperCase()] || monthAbbr || '';
        }

        //将一位数字转换成两位数字：
        function formatDay(day) {
          if (!day) return '';
          return day.toString().padStart(2, '0');
        }

        // 格式化毕业年份函数（修改：保持完整年份格式）
        function formatGradYear(fullYear) {
          if (!fullYear) return '';
          return fullYear.toString(); // 直接返回完整年份，不再截取后两位
        }

        // 格式化OEN函数（新增）
        function formatOEN(oen) {
          if (!oen) return '';
          const oenStr = oen.toString();
          // 如果OEN是9位数字，格式化为 XXX-XXX-XXX
          if (oenStr.length === 9 && /^\d{9}$/.test(oenStr)) {
            return `${oenStr.slice(0,3)}-${oenStr.slice(3,6)}-${oenStr.slice(6,9)}`;
          }
          return oenStr; // 如果不是标准格式，直接返回原值
        }

        // 课程排序和填充函数
        function sortAndFillCourses(courses) {
          console.log(`开始对 ${courses.length} 门已完成课程进行排序和填充`);
          
          // 检查课程数据完整性并输出详细信息
          courses.forEach((course, index) => {
            console.log(`原始课程 ${index + 1}:`, {
              course_code: course.course_code,
              course_name: course.course_name,
              credit: course.credit,
              course_level: course.course_level,
              final_grade: course.final_grade,
              midterm_grade: course.midterm_grade,
              is_compulsory: course.is_compulsory,
              completion_date: course.completion_date,
              status: course.status
            });
            
            if (!course.course_name) {
              console.warn(`课程 ${course.course_code} 在courses表中未找到对应信息`);
            }
          });
          
          // 分离PLE课程和其他课程
          const pleCourses = courses.filter(course => course.course_code === 'PLE');
          const otherCourses = courses.filter(course => course.course_code !== 'PLE');
          
          console.log(`找到 ${pleCourses.length} 门PLE课程`);
          console.log(`找到 ${otherCourses.length} 门其他课程`);
          
          // 对其他课程按completion_date排序（从旧到新）
          otherCourses.sort((a, b) => {
            const dateA = new Date(a.completion_date || '1900-01-01');
            const dateB = new Date(b.completion_date || '1900-01-01');
            return dateA - dateB; // 升序排列，旧日期在前
          });
          
          console.log('其他课程排序后的顺序:');
          otherCourses.forEach((course, index) => {
            console.log(`  ${index + 1}. ${course.course_code} - ${course.completion_date}`);
          });
          
          // 合并课程数组：PLE课程在前，其他课程按日期排序在后
          const sortedCourses = [...pleCourses, ...otherCourses];
          
          console.log('最终填充顺序:');
          sortedCourses.forEach((course, index) => {
            console.log(`  行${index + 1}: ${course.course_code} - ${course.completion_date}`);
          });
          
          // 调用填充函数
          fillCourseData(sortedCourses);
          
          return sortedCourses;
        }

        // 动态填充课程数据的函数
        function fillCourseData(courses) {
          console.log(`开始填充 ${courses.length} 门已完成课程的数据`);
          
          // 处理completion_date的函数（修正后）
          function parseCompletionDate(dateValue) {
            if (!dateValue) return { year: '', month: '' };
            
            let year = '';
            let month = '';
            
            // 如果是Date对象
            if (dateValue instanceof Date) {
              year = dateValue.getFullYear().toString();
              month = (dateValue.getMonth() + 1).toString().padStart(2, '0');
            } 
            // 如果是字符串格式 YYYY-MM-DD
            else if (typeof dateValue === 'string') {
              const dateParts = dateValue.split('-');
              year = dateParts[0] || '';
              month = dateParts[1] || '';
            }
            
            return { year, month };
          }
          
          // 处理年份的函数（添加星号逻辑）
          function formatYear(year, isLocal) {
            if (!year) return '';
            
            // 如果is_local=0，添加星号前缀
            if (isLocal === 0 || isLocal === '0' || isLocal === false) {
              return `*${year}`;
            }
            
            return year;
          }
          
          // 格式化数字为两位小数的函数
          function formatToTwoDecimals(value) {
            if (value === null || value === undefined || value === '') return '0.00';
            const num = parseFloat(value);
            return isNaN(num) ? '0.00' : num.toFixed(2);
          }
          
          // 处理course_level的函数
          function formatCourseLevel(courseLevel) {
            if (!courseLevel) return '';
            
            // 处理ESL级别转换
            const eslMatch = courseLevel.match(/^ESL(\d+)$/);
            if (eslMatch) {
              return eslMatch[1]; // 返回数字部分 (ESL1->1, ESL2->2, etc.)
            }
            
            // 其他情况直接返回原值
            return courseLevel;
          }
          
          // 处理is_compulsory的函数
          function formatCompulsory(isCompulsory) {
            // 如果是1或true或'Yes'，返回"X"，否则返回空字符串
            if (isCompulsory === 1 || isCompulsory === true || isCompulsory === '1' || isCompulsory === 'Yes') {
              return 'X';
            }
            return '';
          }

          // 处理成绩的函数（修改后）
          function formatGrade(grade, courseCode) {
            // 如果是PLE课程，固定返回"EQV"
            if (courseCode === 'PLE') {
              return 'EQV';
            }
            
            if (grade === null || grade === undefined || grade === '') return '';
            
            // 如果是字符串且包含字母，直接返回（如"EQV"）
            if (typeof grade === 'string' && /[a-zA-Z]/.test(grade)) {
              return grade;
            }
            
            // 如果是数字或数字字符串，转换为字符串返回
            const numGrade = parseFloat(grade);
            if (!isNaN(numGrade)) {
              return numGrade.toString();
            }
            
            // 其他情况直接转换为字符串
            return String(grade);
          }
          
          // 遍历所有已完成的课程，动态填充到对应的行
          courses.forEach((course, index) => {
            const rowIndex = index + 1; // 从第1行开始
            
            // 解析completion_date
            const dateInfo = parseCompletionDate(course.completion_date);
            
            // 特殊处理PLE课程
            if (course.course_code === 'PLE') {
              // PLE课程的特殊填充规则
              safeSetTextField(`code${rowIndex}`, course.course_code || '');
              safeSetTextField(`course${rowIndex}`, course.course_name || '');
              safeSetTextField(`level${rowIndex}`, ''); // PLE课程level留白
              safeSetTextField(`grade${rowIndex}`, 'EQV'); // PLE课程grade固定为EQV
              safeSetTextField(`cr${rowIndex}`, formatToTwoDecimals(course.midterm_grade));     // midterm_grade -> cr1 (两位小数)
              safeSetTextField(`compul${rowIndex}`, formatToTwoDecimals(course.final_grade));   // final_grade -> compul1 (两位小数)
              safeSetTextField(`year${rowIndex}`, formatYear(dateInfo.year, course.is_local));
              safeSetTextField(`month${rowIndex}`, dateInfo.month);
              
              console.log(`填充第 ${rowIndex} 行PLE课程数据: ${course.course_code} - ${course.course_name || '课程信息缺失'}`);
              console.log(`  - PLE特殊填充: midterm_grade(${course.midterm_grade}) -> cr${rowIndex}(${formatToTwoDecimals(course.midterm_grade)}), final_grade(${course.final_grade}) -> compul${rowIndex}(${formatToTwoDecimals(course.final_grade)})`);
              console.log(`  - PLE level留白, grade固定为EQV`);
            } else {
              // 普通课程的填充规则
              safeSetTextField(`code${rowIndex}`, course.course_code || '');
              safeSetTextField(`course${rowIndex}`, course.course_name || '');
              safeSetTextField(`level${rowIndex}`, formatCourseLevel(course.course_level));
              safeSetTextField(`grade${rowIndex}`, formatGrade(course.final_grade, course.course_code));
              safeSetTextField(`cr${rowIndex}`, formatToTwoDecimals(course.credit));
              safeSetTextField(`compul${rowIndex}`, formatCompulsory(course.is_compulsory)); // 直接使用formatCompulsory结果：'X'或''
              safeSetTextField(`year${rowIndex}`, formatYear(dateInfo.year, course.is_local));
              safeSetTextField(`month${rowIndex}`, dateInfo.month);
              
              console.log(`填充第 ${rowIndex} 行课程数据: ${course.course_code} - ${course.course_name || '课程信息缺失'}`);
              console.log(`  - 必修课标记: is_compulsory=${course.is_compulsory} -> compul=${formatCompulsory(course.is_compulsory)}`);
            }
            
            console.log(`  - 等级: ${course.course_level} -> ${formatCourseLevel(course.course_level)}`);
            console.log(`  - 成绩: ${course.final_grade} -> ${formatGrade(course.final_grade, course.course_code)}`);
            console.log(`  - 完成日期: ${formatYear(dateInfo.year, course.is_local)}-${dateInfo.month} (${course.completion_date})`);
            console.log(`  - is_local: ${course.is_local} ${course.is_local === 0 ? '(添加星号)' : ''}`);
            console.log(`  - 状态: ${course.status}`);
          });
          
          // 修改：清空多余的行并在第一个空行的course字段填充                                *** Last Official Entry / Fin du relevés de notes ***
          const maxRows = 23; // 根据你的PDF模板实际行数调整
          for (let i = courses.length + 1; i <= maxRows; i++) {
            if (i === courses.length + 1) {
              // 第一个空行：在course字段填充                                *** Last Official Entry / Fin du relevés de notes ***，其他字段清空
              safeSetTextField(`code${i}`, '');
              safeSetTextField(`course${i}`, '                                *** Last Official Entry / Fin du relevés de notes ***');
              safeSetTextField(`level${i}`, '');
              safeSetTextField(`grade${i}`, '');
              safeSetTextField(`cr${i}`, '');
              safeSetTextField(`compul${i}`, '');
              safeSetTextField(`year${i}`, '');
              safeSetTextField(`month${i}`, '');
    
              console.log(`第 ${i} 行填充结束标记: course${i} =                                 *** Last Official Entry / Fin du relevés de notes ***`);
            } else {
              // 其余空行：全部清空
              safeSetTextField(`code${i}`, '');
              safeSetTextField(`course${i}`, '');
              safeSetTextField(`level${i}`, '');
              safeSetTextField(`grade${i}`, '');
              safeSetTextField(`cr${i}`, '');
              safeSetTextField(`compul${i}`, '');
              safeSetTextField(`year${i}`, '');
              safeSetTextField(`month${i}`, '');
            }
          }
          
          // 计算总cr和总compul
          let totalCr = 0;
          let totalCompul = 0;
          
          courses.forEach((course, index) => {
            const rowIndex = index + 1;
            
            if (course.course_code === 'PLE') {
              // PLE课程的特殊计算
              totalCr += parseFloat(course.midterm_grade) || 0;
              totalCompul += parseFloat(course.final_grade) || 0;
            } else {
              // 普通课程的计算
              totalCr += parseFloat(course.credit) || 0;
              if (formatCompulsory(course.is_compulsory) === 'X') {
                totalCompul += parseFloat(course.credit) || 0;
              }
            }
          });
          
          // 填充总计字段
          safeSetTextField('totalcr', totalCr.toFixed(2));
          safeSetTextField('totalcompul', totalCompul.toFixed(2));
          
          console.log(`总学分(totalcr): ${totalCr.toFixed(2)}`);
          console.log(`总必修学分(totalcompul): ${totalCompul.toFixed(2)}`);
        }

        // 填充表单字段
        console.log('开始填充表单字段...');
        
        // 学生基本信息
        safeSetTextField('lastName', student.last_name);
        safeSetTextField('firstName', student.first_name);
        safeSetTextField('OEN', formatOEN(student.OEN)); // 使用格式化后的OEN
        
        // 添加学生号填充
        safeSetTextField('studentNo', student.student_number);
        console.log('填充学生号:', student.student_number);

        // 填充毕业年份（修改：保持完整格式）
        safeSetTextField('gradYear', formatGradYear(student.expected_graduation_year));
        console.log('填充毕业年份:', student.expected_graduation_year, '->', formatGradYear(student.expected_graduation_year));

        // 填充毕业月份（使用学生表里的expected_graduation_month）
        safeSetTextField('gradMon', convertMonthToNumber(student.expected_graduation_month));
        console.log('填充毕业月份:', student.expected_graduation_month, '->', convertMonthToNumber(student.expected_graduation_month));

        // 当前日期 yyyy/mm/dd
        const now = new Date();
        const dateStr = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')}`;
        safeSetTextField('date', dateStr);

        // 固定页码
        safeSetTextField('currPage', '1');
        safeSetTextField('totalPage', '1');

        // 出生日期
        safeSetTextField('dobYear', student.birth_year ? student.birth_year.toString() : '');
        safeSetTextField('dobMonth', convertMonthToNumber(student.birth_month));
        safeSetTextField('dobDay', formatDay(student.birth_day));

        // 入学日期
        safeSetTextField('enrollYear', student.enrollment_year ? student.enrollment_year.toString() : '');
        safeSetTextField('enrollMonth', convertMonthToNumber(student.enrollment_month));
        safeSetTextField('enrollDay', formatDay(student.enrollment_day));

        // 对课程进行排序并填充（PLE优先，其他按日期排序）
        const sortedCourses = buildAndFillMultilineColumns(coursesResults);

        console.log('表单字段填充完成');

        // 提交修改
        //form.flatten(); // 如果你想让表单不可编辑可去掉这行

        // 保存PDF
        console.log('正在保存PDF...');
        const pdfBytes = await pdfDoc.save();

        // 返回PDF给前端
        res.setHeader('Content-Type', 'application/pdf');
        function createSafeFileName(lastName, firstName) {
          const safeLast = (lastName || '').replace(/[<>:"/\\|?*]/g, '').trim();
          const safeFirst = (firstName || '').replace(/[<>:"/\\|?*]/g, '').trim();
          return `${safeLast} ${safeFirst} EVA Final OST 2025.pdf`;
        }

        const fileName = createSafeFileName(student.last_name, student.first_name);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(Buffer.from(pdfBytes));
        
        console.log('PDF生成成功，OEN:', oen, '- 已完成课程数量:', sortedCourses.length);
        console.log('课程填充顺序:', sortedCourses.map(c => `${c.course_code}(${c.completion_date})`).join(' -> '));
      } catch (error) {
        console.error('生成PDF失败:', error);
        console.error('错误堆栈:', error.stack);
        res.status(500).json({ error: '生成PDF失败', details: error.message });
      }
    });
  });
});
// ========================================
// student final ost 相关功能结束
// ========================================





// ========================================
// student ost相关功能
// ========================================
//普通OST pdf - 与Final OST相同但不填充毕业年份和月份
app.get('/generate-ost-pdf/:oen', async (req, res) => {
 const oen = req.params.oen;
 console.log('Received OST PDF generation request for OEN:', oen);

 // 第一个查询：获取学生基本信息（添加student_number和expected_graduation_year、expected_graduation_month字段）
 const studentQuery = `
   SELECT student_id, last_name, first_name, OEN, student_number,
     birth_year, birth_month, birth_day,
     enrollment_year, enrollment_month, enrollment_day,
     expected_graduation_year, expected_graduation_month
   FROM students
   WHERE OEN = ?;
 `;

 db.query(studentQuery, [oen], async (err, studentResults) => {
   if (err) {
     console.error('数据库查询失败:', err);
     return res.status(500).json({ error: '数据库查询失败' });
   }
   if (studentResults.length === 0) {
     console.log('未找到OEN为', oen, '的学生');
     return res.status(404).json({ error: '找不到该学生' });
   }

   const student = studentResults[0];
   console.log('找到学生:', student);

   // 第二个查询：三表关联查询获取完整的课程信息（修正后）
   const coursesQuery = `
     SELECT
       sc.student_id,
       sc.course_code,
       sc.final_grade,
       sc.midterm_grade,
       sc.completion_date,
       sc.is_compulsory,
       sc.is_local,
       sc.status,
       c.course_name,
       c.credit,
       c.course_level
     FROM student_courses sc
     LEFT JOIN courses c ON sc.course_code = c.course_code
     WHERE sc.student_id = ? AND sc.status = 'COMPLETED'
   `;

   db.query(coursesQuery, [student.student_id], async (coursesErr, coursesResults) => {
     if (coursesErr) {
       console.error('查询课程信息失败:', coursesErr);
       return res.status(500).json({ error: '查询课程信息失败' });
     }

     console.log('找到已完成的课程记录:', coursesResults.length, '条');

     try {
       // 读入OST PDF模板（注意这里使用OST.pdf而不是FinalOST.pdf）
       const templatePath = path.join(__dirname, 'templates', 'OST.pdf');
      
       // 检查模板文件是否存在
       if (!fs.existsSync(templatePath)) {
         console.error('OST PDF模板文件不存在:', templatePath);
         return res.status(500).json({ error: 'OST PDF模板文件不存在' });
       }
      
       console.log('正在读取OST PDF模板文件:', templatePath);
       const existingPdfBytes = fs.readFileSync(templatePath);

       // 加载PDF
       console.log('正在加载PDF文档...');
       const pdfDoc = await PDFDocument.load(existingPdfBytes);

       // 获取表单
       console.log('正在获取PDF表单...');
       const form = pdfDoc.getForm();
      
       // 获取所有表单字段名，用于调试
       const fieldNames = form.getFields().map(field => field.getName());
       console.log('OST PDF中可用的表单字段:', fieldNames);

       // 安全填充表单字段的辅助函数
       function safeSetTextField(fieldName, value) {
         try {
           const field = form.getTextField(fieldName);
           if (field) {
             // 确保value是字符串类型
             const stringValue = value !== null && value !== undefined ? String(value) : '';
             field.setText(stringValue);
             console.log(`成功填充字段 ${fieldName}: ${stringValue}`);
           } else {
             console.warn(`字段 ${fieldName} 不存在`);
           }
         } catch (error) {
           console.error(`填充字段 ${fieldName} 时出错:`, error.message);
           // 尝试查找相似的字段名
           const similarFields = fieldNames.filter(name =>
             name.toLowerCase().includes(fieldName.toLowerCase()) ||
             fieldName.toLowerCase().includes(name.toLowerCase())
           );
           if (similarFields.length > 0) {
             console.log(`可能的相似字段: ${similarFields.join(', ')}`);
           }
         }
       }

       //转换月份字母对数字
       function convertMonthToNumber(monthAbbr) {
         const monthMap = {
           'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
           'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
           'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
         };
         return monthMap[monthAbbr?.toUpperCase()] || monthAbbr || '';
       }

       //将一位数字转换成两位数字：
       function formatDay(day) {
         if (!day) return '';
         return day.toString().padStart(2, '0');
       }

       // 格式化OEN函数
       function formatOEN(oen) {
         if (!oen) return '';
         const oenStr = oen.toString();
         // 如果OEN是9位数字，格式化为 XXX-XXX-XXX
         if (oenStr.length === 9 && /^\d{9}$/.test(oenStr)) {
           return `${oenStr.slice(0,3)}-${oenStr.slice(3,6)}-${oenStr.slice(6,9)}`;
         }
         return oenStr; // 如果不是标准格式，直接返回原值
       }

       // 课程排序和填充函数
       function sortAndFillCourses(courses) {
         console.log(`开始对 ${courses.length} 门已完成课程进行排序和填充`);
        
         // 检查课程数据完整性并输出详细信息
         courses.forEach((course, index) => {
           console.log(`原始课程 ${index + 1}:`, {
             course_code: course.course_code,
             course_name: course.course_name,
             credit: course.credit,
             course_level: course.course_level,
             final_grade: course.final_grade,
             midterm_grade: course.midterm_grade,
             is_compulsory: course.is_compulsory,
             completion_date: course.completion_date,
             status: course.status
           });
          
           if (!course.course_name) {
             console.warn(`课程 ${course.course_code} 在courses表中未找到对应信息`);
           }
         });
        
         // 分离PLE课程和其他课程
         const pleCourses = courses.filter(course => course.course_code === 'PLE');
         const otherCourses = courses.filter(course => course.course_code !== 'PLE');
        
         console.log(`找到 ${pleCourses.length} 门PLE课程`);
         console.log(`找到 ${otherCourses.length} 门其他课程`);
        
         // 对其他课程按completion_date排序（从旧到新）
         otherCourses.sort((a, b) => {
           const dateA = new Date(a.completion_date || '1900-01-01');
           const dateB = new Date(b.completion_date || '1900-01-01');
           return dateA - dateB; // 升序排列，旧日期在前
         });
        
         console.log('其他课程排序后的顺序:');
         otherCourses.forEach((course, index) => {
           console.log(`  ${index + 1}. ${course.course_code} - ${course.completion_date}`);
         });
        
         // 合并课程数组：PLE课程在前，其他课程按日期排序在后
         const sortedCourses = [...pleCourses, ...otherCourses];
        
         console.log('最终填充顺序:');
         sortedCourses.forEach((course, index) => {
           console.log(`  行${index + 1}: ${course.course_code} - ${course.completion_date}`);
         });
        
         // 调用填充函数
         fillCourseData(sortedCourses);
        
         return sortedCourses;
       }

       // 动态填充课程数据的函数
       function fillCourseData(courses) {
         console.log(`开始填充 ${courses.length} 门已完成课程的数据`);
        
         // 处理completion_date的函数（修正后）
         function parseCompletionDate(dateValue) {
           if (!dateValue) return { year: '', month: '' };
          
           let year = '';
           let month = '';
          
           // 如果是Date对象
           if (dateValue instanceof Date) {
             year = dateValue.getFullYear().toString();
             month = (dateValue.getMonth() + 1).toString().padStart(2, '0');
           }
           // 如果是字符串格式 YYYY-MM-DD
           else if (typeof dateValue === 'string') {
             const dateParts = dateValue.split('-');
             year = dateParts[0] || '';
             month = dateParts[1] || '';
           }
          
           return { year, month };
         }
        
         // 处理年份的函数（添加星号逻辑）
         function formatYear(year, isLocal) {
           if (!year) return '';
          
           // 如果is_local=0，添加星号前缀
           if (isLocal === 0 || isLocal === '0' || isLocal === false) {
             return `*${year}`;
           }
          
           return year;
         }
        
         // 格式化数字为两位小数的函数
         function formatToTwoDecimals(value) {
           if (value === null || value === undefined || value === '') return '0.00';
           const num = parseFloat(value);
           return isNaN(num) ? '0.00' : num.toFixed(2);
         }
        
         // 处理course_level的函数
         function formatCourseLevel(courseLevel) {
           if (!courseLevel) return '';
          
           // 处理ESL级别转换
           const eslMatch = courseLevel.match(/^ESL(\d+)$/);
           if (eslMatch) {
             return eslMatch[1]; // 返回数字部分 (ESL1->1, ESL2->2, etc.)
           }
          
           // 其他情况直接返回原值
           return courseLevel;
         }
        
         // 处理is_compulsory的函数
         function formatCompulsory(isCompulsory) {
           // 如果是1或true或'Yes'，返回"X"，否则返回空字符串
           if (isCompulsory === 1 || isCompulsory === true || isCompulsory === '1' || isCompulsory === 'Yes') {
             return 'X';
           }
           return '';
         }

         // 处理成绩的函数（修改后）
         function formatGrade(grade, courseCode) {
           // 如果是PLE课程，固定返回"EQV"
           if (courseCode === 'PLE') {
             return 'EQV';
           }
          
           if (grade === null || grade === undefined || grade === '') return '';
          
           // 如果是字符串且包含字母，直接返回（如"EQV"）
           if (typeof grade === 'string' && /[a-zA-Z]/.test(grade)) {
             return grade;
           }
          
           // 如果是数字或数字字符串，转换为字符串返回
           const numGrade = parseFloat(grade);
           if (!isNaN(numGrade)) {
             return numGrade.toString();
           }
          
           // 其他情况直接转换为字符串
           return String(grade);
         }
        
         // 遍历所有已完成的课程，动态填充到对应的行
         courses.forEach((course, index) => {
           const rowIndex = index + 1; // 从第1行开始
          
           // 解析completion_date
           const dateInfo = parseCompletionDate(course.completion_date);
          
           // 特殊处理PLE课程
           if (course.course_code === 'PLE') {
             // PLE课程的特殊填充规则
             safeSetTextField(`code${rowIndex}`, course.course_code || '');
             safeSetTextField(`course${rowIndex}`, course.course_name || '');
             safeSetTextField(`level${rowIndex}`, ''); // PLE课程level留白
             safeSetTextField(`grade${rowIndex}`, 'EQV'); // PLE课程grade固定为EQV
             safeSetTextField(`cr${rowIndex}`, formatToTwoDecimals(course.midterm_grade));     // midterm_grade -> cr1 (两位小数)
             safeSetTextField(`compul${rowIndex}`, formatToTwoDecimals(course.final_grade));   // final_grade -> compul1 (两位小数)
             safeSetTextField(`year${rowIndex}`, formatYear(dateInfo.year, course.is_local));
             safeSetTextField(`month${rowIndex}`, dateInfo.month);
            
             console.log(`填充第 ${rowIndex} 行PLE课程数据: ${course.course_code} - ${course.course_name || '课程信息缺失'}`);
             console.log(`  - PLE特殊填充: midterm_grade(${course.midterm_grade}) -> cr${rowIndex}(${formatToTwoDecimals(course.midterm_grade)}), final_grade(${course.final_grade}) -> compul${rowIndex}(${formatToTwoDecimals(course.final_grade)})`);
             console.log(`  - PLE level留白, grade固定为EQV`);
           } else {
             // 普通课程的填充规则
             safeSetTextField(`code${rowIndex}`, course.course_code || '');
             safeSetTextField(`course${rowIndex}`, course.course_name || '');
             safeSetTextField(`level${rowIndex}`, formatCourseLevel(course.course_level));
             safeSetTextField(`grade${rowIndex}`, formatGrade(course.final_grade, course.course_code));
             safeSetTextField(`cr${rowIndex}`, formatToTwoDecimals(course.credit));
             safeSetTextField(`compul${rowIndex}`, formatCompulsory(course.is_compulsory)); // 直接使用formatCompulsory结果：'X'或''
             safeSetTextField(`year${rowIndex}`, formatYear(dateInfo.year, course.is_local));
             safeSetTextField(`month${rowIndex}`, dateInfo.month);
            
             console.log(`填充第 ${rowIndex} 行课程数据: ${course.course_code} - ${course.course_name || '课程信息缺失'}`);
             console.log(`  - 必修课标记: is_compulsory=${course.is_compulsory} -> compul=${formatCompulsory(course.is_compulsory)}`);
           }
          
           console.log(`  - 等级: ${course.course_level} -> ${formatCourseLevel(course.course_level)}`);
           console.log(`  - 成绩: ${course.final_grade} -> ${formatGrade(course.final_grade, course.course_code)}`);
           console.log(`  - 完成日期: ${formatYear(dateInfo.year, course.is_local)}-${dateInfo.month} (${course.completion_date})`);
           console.log(`  - is_local: ${course.is_local} ${course.is_local === 0 ? '(添加星号)' : ''}`);
           console.log(`  - 状态: ${course.status}`);
         });
        
         // 如果需要清空多余的行（比如PDF模板有23行，但学生只有6门课）
         const maxRows = 23; // 根据你的PDF模板实际行数调整
         for (let i = courses.length + 1; i <= maxRows; i++) {
           if (i === courses.length + 1) {
             // 第一个空行：在course字段填                                *** Last Official Entry / Fin du relevés de notes ***，其他字段清空
             safeSetTextField(`code${i}`, '');
             safeSetTextField(`course${i}`, '                                *** Last Official Entry / Fin du relevés de notes ***');
             safeSetTextField(`level${i}`, '');
             safeSetTextField(`grade${i}`, '');
             safeSetTextField(`cr${i}`, '');
             safeSetTextField(`compul${i}`, '');
             safeSetTextField(`year${i}`, '');
             safeSetTextField(`month${i}`, '');
  
             console.log(`第 ${i} 行填充结束标记: course${i} =                                 *** Last Official Entry / Fin du relevés de notes ***`);
           } else {
           // 其余空行：全部清空
           safeSetTextField(`code${i}`, '');
           safeSetTextField(`course${i}`, '');
           safeSetTextField(`level${i}`, '');
           safeSetTextField(`grade${i}`, '');
           safeSetTextField(`cr${i}`, '');
           safeSetTextField(`compul${i}`, '');
           safeSetTextField(`year${i}`, '');
           safeSetTextField(`month${i}`, '');
           }
         }
        
         // 计算总cr和总compul
         let totalCr = 0;
         let totalCompul = 0;
        
         courses.forEach((course, index) => {
           const rowIndex = index + 1;
          
           if (course.course_code === 'PLE') {
             // PLE课程的特殊计算
             totalCr += parseFloat(course.midterm_grade) || 0;
             totalCompul += parseFloat(course.final_grade) || 0;
           } else {
             // 普通课程的计算
             totalCr += parseFloat(course.credit) || 0;
             if (formatCompulsory(course.is_compulsory) === 'X') {
               totalCompul += parseFloat(course.credit) || 0;
             }
           }
         });
        
         // 填充总计字段
         safeSetTextField('totalcr', totalCr.toFixed(2));
         safeSetTextField('totalcompul', totalCompul.toFixed(2));
        
         console.log(`总学分(totalcr): ${totalCr.toFixed(2)}`);
         console.log(`总必修学分(totalcompul): ${totalCompul.toFixed(2)}`);
       }

       // 填充表单字段
       console.log('开始填充表单字段...');
      
       // 学生基本信息
       safeSetTextField('lastName', student.last_name);
       safeSetTextField('firstName', student.first_name);
       safeSetTextField('OEN', formatOEN(student.OEN)); // 使用格式化后的OEN
      
       // 添加学生号填充
       safeSetTextField('studentNo', student.student_number);
       console.log('填充学生号:', student.student_number);

       // OST版本不填充毕业年份和月份，留空白
       // safeSetTextField('gradYear', ''); 
       // safeSetTextField('gradMon', '');
       console.log('OST版本：毕业年份和月份留空白');

       // 当前日期 yyyy/mm/dd
       const now = new Date();
       const dateStr = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')}`;
       safeSetTextField('date', dateStr);

       // 固定页码
       safeSetTextField('currPage', '1');
       safeSetTextField('totalPage', '1');

       // 出生日期
       safeSetTextField('dobYear', student.birth_year ? student.birth_year.toString() : '');
       safeSetTextField('dobMonth', convertMonthToNumber(student.birth_month));
       safeSetTextField('dobDay', formatDay(student.birth_day));

       // 入学日期
       safeSetTextField('enrollYear', student.enrollment_year ? student.enrollment_year.toString() : '');
       safeSetTextField('enrollMonth', convertMonthToNumber(student.enrollment_month));
       safeSetTextField('enrollDay', formatDay(student.enrollment_day));

       // 对课程进行排序并填充（PLE优先，其他按日期排序）
       const sortedCourses = buildAndFillMultilineColumns(coursesResults);

       console.log('表单字段填充完成');

       // 提交修改
       //form.flatten(); // 如果你想让表单不可编辑可去掉这行

       // 保存PDF
       console.log('正在保存PDF...');
       const pdfBytes = await pdfDoc.save();

       // 返回PDF给前端
       res.setHeader('Content-Type', 'application/pdf');
       function createSafeFileName(lastName, firstName) {
         const safeLast = (lastName || '').replace(/[<>:"/\\|?*]/g, '').trim();
         const safeFirst = (firstName || '').replace(/[<>:"/\\|?*]/g, '').trim();
         return `${safeLast} ${safeFirst} EVA OST 2025.pdf`;
       }

       const fileName = createSafeFileName(student.last_name, student.first_name);
       res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
       res.send(Buffer.from(pdfBytes));
      
       console.log('OST PDF生成成功，OEN:', oen, '- 已完成课程数量:', sortedCourses.length);
       console.log('课程填充顺序:', sortedCourses.map(c => `${c.course_code}(${c.completion_date})`).join(' -> '));
     } catch (error) {
       console.error('生成OST PDF失败:', error);
       console.error('错误堆栈:', error.stack);
       res.status(500).json({ error: '生成OST PDF失败', details: error.message });
     }
   });
 });
});



// ========================================
// student ost 相关功能结束
// ========================================

// ========================================
// addstudent.html 相关功能
// ========================================

// 添加新学生 - 增强版本，包含PLAR、已完成课程和当前课程处理
app.post('/students', (req, res) => {
 console.log('收到添加学生请求:', req.body);
  const {
   firstName,
   lastName,
   oen,
   studentNumber,
   studentAddress,
   dobYear,
   dobMonth,
   dobDate,
   enrollYear,
   enrollMonth,
   enrollDate,
   gradYear,
   gradMonth,
   gradDate,
   grade,
   volunteerHours,
   remark,
   plarData,
   completedCourses,
   currentCourses  // 新增这一行
 } = req.body;


 // 验证必填字段
 if (!firstName || !lastName || !oen || !dobYear || !dobMonth || !dobDate ||
     !enrollYear || !enrollMonth || !enrollDate || !gradYear || !gradMonth || !gradDate) {
   return res.status(400).json({
     error: '缺少必填字段',
     message: 'First Name, Last Name, OEN, DOB, Enrollment Date, and Graduation Date are required'
   });
 }


 // 开始数据库事务
 db.beginTransaction((err) => {
   if (err) {
     console.error('开始事务失败:', err);
     return res.status(500).json({ error: '数据库事务失败' });
   }


   // 插入学生数据的SQL语句
   const insertStudentQuery = `
     INSERT INTO students (
       first_name,
       last_name,
       OEN,
       student_number,
       address,
       birth_year,
       birth_month,
       birth_day,
       enrollment_year,
       enrollment_month,
       enrollment_day,
       expected_graduation_year,
       expected_graduation_month,
       expected_graduation_day,
       grade,
       volunteer_hours,
       remark
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   `;


   const studentValues = [
     firstName,
     lastName,
     oen,
     studentNumber || null,
     studentAddress || null,
     parseInt(dobYear),
     dobMonth,
     parseInt(dobDate),
     parseInt(enrollYear),
     enrollMonth,
     parseInt(enrollDate),
     parseInt(gradYear),
     gradMonth,
     parseInt(gradDate),
     grade || null,
     volunteerHours ? parseInt(volunteerHours) : null,
     remark || null
   ];


   // 第一步：插入学生基本信息
   db.query(insertStudentQuery, studentValues, (err, studentResult) => {
     if (err) {
       console.error('插入学生数据失败：', err);
       return db.rollback(() => {
         if (err.code === 'ER_DUP_ENTRY') {
           return res.status(400).json({
             error: 'OEN already exists',
             message: 'A student with this OEN already exists in the database'
           });
         }
         return res.status(500).json({
           error: '数据库插入失败',
           details: err.message
         });
       });
     }


     const studentId = studentResult.insertId;
     console.log('学生基本信息添加成功，student_id:', studentId);


     // 第二步：处理PLAR信息
     const processPLAR = (callback) => {
       if (!plarData || !plarData.hasPLAR) {
         console.log('无PLAR数据，跳过PLAR处理');
         return callback(null);
       }


       console.log('开始处理PLAR数据:', plarData);


       // 格式化PLAR日期
       const plarDate = formatDate(plarData.startYear, plarData.startMonth, plarData.startDate);
      
       if (!plarDate) {
         console.log('PLAR日期不完整，跳过PLAR处理');
         return callback(null);
       }


       const insertPLARQuery = `
         INSERT INTO student_courses (
           student_id,
           course_code,
           status,
           is_local,
           is_compulsory,
           start_year,
           start_month,
           start_day,
           report_card_date,
           completion_date,
           midterm_grade,
           final_grade
         ) VALUES (?, 'PLE', 'COMPLETED', ?, 0, ?, ?, ?, ?, ?, ?, ?)
       `;


       const plarValues = [
         studentId,
         plarData.isLocal, // PLAR done at EVA? 1=yes, 0=no
         parseInt(plarData.startYear),
         plarData.startMonth,
         parseInt(plarData.startDate),
         plarDate, // report_card_date
         plarDate, // completion_date
         plarData.totalCredits || null, // midterm_grade存储total PLAR credits
         plarData.compulsoryCredits || null // final_grade存储compulsory PLAR credits
       ];


       db.query(insertPLARQuery, plarValues, (err, plarResult) => {
         if (err) {
           console.error('插入PLAR数据失败：', err);
           return callback(err);
         }
         console.log('PLAR数据插入成功，course_id:', plarResult.insertId);
         callback(null);
       });
     };


     // 第三步：处理已完成课程
     const processCompletedCourses = (callback) => {
       if (!completedCourses || completedCourses.length === 0) {
         console.log('无已完成课程数据，跳过课程处理');
         return callback(null);
       }


       console.log('开始处理已完成课程数据:', completedCourses);


       let processedCount = 0;
       const totalCourses = completedCourses.length;


       // 处理每个已完成的课程
       completedCourses.forEach((course, index) => {
         // 跳过没有课程代码的记录
         if (!course.courseCode || course.courseCode.trim() === '') {
           processedCount++;
           if (processedCount === totalCourses) {
             callback(null);
           }
           return;
         }


         // 格式化完成日期
         const completionDate = formatDate(course.completionYear, course.completionMonth, course.completionDate);
        
         if (!completionDate) {
           console.log(`课程 ${course.courseCode} 的完成日期不完整，跳过`);
           processedCount++;
           if (processedCount === totalCourses) {
             callback(null);
           }
           return;
         }


         const insertCourseQuery = `
           INSERT INTO student_courses (
             student_id,
             course_code,
             status,
             is_local,
             is_compulsory,
             start_year,
             start_month,
             start_day,
             report_card_date,
             completion_date,
             midterm_grade,
             final_grade
           ) VALUES (?, ?, 'COMPLETED', ?, ?, ?, ?, ?, ?, ?, ?, ?)
         `;


         const courseValues = [
           studentId,
           course.courseCode.trim(),
           course.isLocal, // Local Course? 1=yes, 0=no
           course.isCompulsory, // Compulsory? 1=yes, 0=no
           course.startYear ? parseInt(course.startYear) : null,
           course.startMonth || null,
           course.startDate ? parseInt(course.startDate) : null,
           completionDate, // report_card_date
           completionDate, // completion_date
           course.midtermGrade || null,
           course.finalGrade || null
         ];


         db.query(insertCourseQuery, courseValues, (err, courseResult) => {
           if (err) {
             console.error(`插入课程 ${course.courseCode} 失败：`, err);
             return callback(err);
           }


           console.log(`课程 ${course.courseCode} 插入成功，course_id:`, courseResult.insertId);
           processedCount++;


           // 检查是否所有课程都处理完毕
           if (processedCount === totalCourses) {
             callback(null);
           }
         });
       });
     };


     // 第四步：处理当前课程
     const processCurrentCourses = (callback) => {
       if (!currentCourses || currentCourses.length === 0) {
         console.log('无当前课程数据，跳过当前课程处理');
         return callback(null);
       }


       console.log('开始处理当前课程数据:', currentCourses);


       let processedCount = 0;
       const totalCourses = currentCourses.length;


       // 处理每个当前课程
       currentCourses.forEach((course, index) => {
         // 跳过没有课程代码的记录
         if (!course.courseCode || course.courseCode.trim() === '') {
           processedCount++;
           if (processedCount === totalCourses) {
             callback(null);
           }
           return;
         }


         const insertCourseQuery = `
           INSERT INTO student_courses (
             student_id,
             course_code,
             status,
             is_local,
             is_compulsory,
             start_year,
             start_month,
             start_day,
             midterm_grade
           ) VALUES (?, ?, 'IN_PROGRESS', ?, ?, ?, ?, ?, ?)
         `;


         const courseValues = [
           studentId,
           course.courseCode.trim(),
           course.isLocal, // Local Course? 1=yes, 0=no
           course.isCompulsory, // Compulsory? 1=yes, 0=no
           course.startYear ? parseInt(course.startYear) : null,
           course.startMonth || null,
           course.startDate ? parseInt(course.startDate) : null,
           course.midtermGrade || null
         ];


         db.query(insertCourseQuery, courseValues, (err, courseResult) => {
           if (err) {
             console.error(`插入当前课程 ${course.courseCode} 失败：`, err);
             return callback(err);
           }


           console.log(`当前课程 ${course.courseCode} 插入成功，course_id:`, courseResult.insertId);
           processedCount++;


           // 检查是否所有当前课程都处理完毕
           if (processedCount === totalCourses) {
             callback(null);
           }
         });
       });
     };


     // 依次执行PLAR、已完成课程和当前课程处理
     processPLAR((plarError) => {
       if (plarError) {
         console.error('PLAR处理失败:', plarError);
         return db.rollback(() => {
           res.status(500).json({
             error: 'PLAR数据处理失败',
             details: plarError.message
           });
         });
       }


       processCompletedCourses((courseError) => {
         if (courseError) {
           console.error('课程处理失败:', courseError);
           return db.rollback(() => {
             res.status(500).json({
               error: '课程数据处理失败',
               details: courseError.message
             });
           });
         }


         // 处理当前课程
         processCurrentCourses((currentCourseError) => {
           if (currentCourseError) {
             console.error('当前课程处理失败:', currentCourseError);
             return db.rollback(() => {
               res.status(500).json({
                 error: '当前课程数据处理失败',
                 details: currentCourseError.message
               });
             });
           }


           // 所有数据处理成功，提交事务
           db.commit((commitError) => {
             if (commitError) {
               console.error('提交事务失败:', commitError);
               return db.rollback(() => {
                 res.status(500).json({
                   error: '数据提交失败',
                   details: commitError.message
                 });
               });
             }


             console.log('学生及所有课程数据全部添加成功');
             res.status(201).json({
               message: '学生添加成功',
               studentId: studentId,
               insertedData: {
                 student_id: studentId,
                 first_name: firstName,
                 last_name: lastName,
                 OEN: oen
               }
             });
           });
         });
       });
     });
   });
 });
});


// ========================================
// addstudent.html 相关功能结束
// ========================================



// ========================================
// studentdetail.html 相关功能
// ========================================

// API端点：根据OEN获取单个学生详细信息
app.get('/api/student/:oen/detail', (req, res) => {
  const oen = req.params.oen.replace(/-/g, ''); // 移除连字符
  console.log(`📋 收到获取学生详情请求，OEN: ${oen}`);
  
  const query = `
    SELECT 
      first_name,
      last_name,
      oen,
      student_number,
      graduation_status,
      grade,
      birth_year,
      birth_month,
      birth_day,
      enrollment_year,
      enrollment_month,
      enrollment_day,
      expected_graduation_year,
      expected_graduation_month,
      expected_graduation_day,
      volunteer_hours,
      address,
      remark
    FROM students
    WHERE oen = ?
  `;

  db.query(query, [oen], (err, results) => {
    if (err) {
      console.error('❌ 查询学生详情失败：', err);
      res.status(500).json({ 
        error: '获取学生详情失败', 
        details: err.message 
      });
      return;
    }

    if (results.length === 0) {
      console.log('⚠️ 未找到该学生');
      res.status(404).json({ error: '未找到该学生' });
      return;
    }

    const student = results[0];
    console.log('✅ 成功获取学生详情:', student.first_name, student.last_name);

    // 格式化数据
    const formattedStudent = {
      firstName: student.first_name || '',
      lastName: student.last_name || '',
      oen: formatOEN(student.oen),
      studentNumber: student.student_number || '', 
      status: student.graduation_status || '',
      grade: student.grade || '',
      dateOfBirth: formatDate(student.birth_year, student.birth_month, student.birth_day),
      enrollmentDate: formatDate(student.enrollment_year, student.enrollment_month, student.enrollment_day),
      graduationDate: formatDate(student.expected_graduation_year, student.expected_graduation_month, student.expected_graduation_day),
      volunteerHours: student.volunteer_hours || 0,
      address: student.address || '',
      remark: student.remark || ''
    };

    res.json(formattedStudent);
  });
});

// API端点：更新学生信息
app.put('/api/student/:oen', (req, res) => {
  const oen = req.params.oen.replace(/-/g, ''); // 移除连字符
  const updates = req.body;
  console.log(`✏️ 收到更新学生信息请求，OEN: ${oen}`, updates);

  // 解析日期字段
  const parseDate = (dateStr) => {
    if (!dateStr) return { year: null, month: null, day: null };
  
    // 使用正则表达式验证格式
    const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  
    if (!dateMatch) {
      console.warn(`无效的日期格式: ${dateStr}`);
      return { year: null, month: null, day: null };
    }
  
    return {
      year: parseInt(dateMatch[1], 10),
      month: dateMatch[2], // 保持字符串格式 "01"-"12"
      day: dateMatch[3]    // 保持字符串格式 "01"-"31"
    };
  };

  const dobParts = parseDate(updates.dob);
  const enrollmentParts = parseDate(updates.enrollment_date);
  const graduationParts = parseDate(updates.expected_graduation_date);

  const query = `
    UPDATE students SET
      first_name = ?,
      last_name = ?,
      graduation_status = ?,
      grade = ?,
      birth_year = ?,
      birth_month = ?,
      birth_day = ?,
      enrollment_year = ?,
      enrollment_month = ?,
      enrollment_day = ?,
      expected_graduation_year = ?,
      expected_graduation_month = ?,
      expected_graduation_day = ?,
      volunteer_hours = ?,
      address = ?, 
      student_number = ?,  -- 新增
      remark = ?  -- 新增
    WHERE oen = ?
  `;

  const values = [
    updates.first_name,
    updates.last_name,
    updates.graduation_status,
    updates.grade,
    dobParts.year,
    dobParts.month,
    dobParts.day,
    enrollmentParts.year,
    enrollmentParts.month,
    enrollmentParts.day,
    graduationParts.year,
    graduationParts.month,
    graduationParts.day,
    updates.volunteer_hours,
    updates.address,
    updates.student_number,  // 新增
    updates.remark,  // 新增
    oen
  ];

  db.query(query, values, (err, results) => {
    if (err) {
      console.error('❌ 更新学生信息失败：', err);
      res.status(500).json({ 
        error: '更新学生信息失败', 
        details: err.message 
      });
      return;
    }

    if (results.affectedRows === 0) {
      console.log('⚠️ 未找到要更新的学生');
      res.status(404).json({ error: '未找到要更新的学生' });
      return;
    }

    console.log('✅ 学生信息更新成功');
    res.json({ message: '学生信息更新成功' });
  });
});

// API端点：删除学生
app.delete('/api/student/:oen', (req, res) => {
  const oen = req.params.oen.replace(/-/g, ''); // 移除连字符
  console.log(`🗑️ 收到删除学生请求，OEN: ${oen}`);

  const query = 'DELETE FROM students WHERE oen = ?';

  db.query(query, [oen], (err, results) => {
    if (err) {
      console.error('❌ 删除学生失败：', err);
      res.status(500).json({ 
        error: '删除学生失败', 
        details: err.message 
      });
      return;
    }

    if (results.affectedRows === 0) {
      console.log('⚠️ 未找到要删除的学生');
      res.status(404).json({ error: '未找到要删除的学生' });
      return;
    }

    console.log('✅ 学生删除成功');
    res.json({ message: '学生删除成功' });
  });
});



// ========================================
// studentdetail.html 相关功能结束
// ========================================


// ========================================
// studentmain.html 相关功能
// ========================================

// API端点：获取所有学生数据
app.get('/api/students', (req, res) => {
  console.log('📋 收到获取学生数据请求');
  
  const query = `
    SELECT 
      last_name,
      first_name,
      oen,
      birth_year,
      birth_month,
      birth_day,
      enrollment_year,
      enrollment_month,
      enrollment_day,
      expected_graduation_year,
      expected_graduation_month,
      expected_graduation_day
    FROM students
    ORDER BY last_name, first_name
  `;

  console.log('📊 执行查询:', query.replace(/\s+/g, ' ').trim());

  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ 查询学生数据失败：', err);
      console.error('错误详情：', {
        code: err.code,
        errno: err.errno,
        sqlMessage: err.sqlMessage,
        sqlState: err.sqlState,
        index: err.index
      });
      res.status(500).json({ 
        error: '获取学生数据失败', 
        details: err.message,
        code: err.code
      });
      return;
    }

    console.log(`✅ 查询成功，找到 ${results.length} 条记录`);

    if (results.length > 0) {
      console.log('📝 第一条记录示例:', results[0]);
    }

    // 处理数据格式
    const formattedStudents = results.map(student => ({
      studentName: `${student.last_name || ''} ${student.first_name || ''}`.trim(),
      oen: formatOEN(student.oen),
      dateOfBirth: formatDate(student.birth_year, student.birth_month, student.birth_day),
      enrollmentDate: formatDate(student.enrollment_year, student.enrollment_month, student.enrollment_day),
      graduationDate: formatDate(student.expected_graduation_year, student.expected_graduation_month, student.expected_graduation_day)
    }));

    console.log(`🎯 返回 ${formattedStudents.length} 条格式化的学生记录`);
    res.json(formattedStudents);
  });
});

// API端点：搜索学生
app.get('/api/students/search', (req, res) => {
  const searchTerm = req.query.q;
  console.log(`🔍 收到搜索请求: "${searchTerm}"`);
  
  if (!searchTerm) {
    console.log('⚠️ 搜索词为空，返回空结果');
    return res.json([]);
  }

  const query = `
    SELECT 
      last_name,
      first_name,
      oen,
      birth_year,
      birth_month,
      birth_day,
      enrollment_year,
      enrollment_month,
      enrollment_day,
      expected_graduation_year,
      expected_graduation_month,
      expected_graduation_day
    FROM students
    WHERE 
      CONCAT(last_name, ' ', first_name) LIKE ? OR
      last_name LIKE ? OR
      first_name LIKE ? OR
      oen LIKE ?
    ORDER BY last_name, first_name
  `;

  const searchPattern = `%${searchTerm}%`;
  console.log('🔍 执行搜索查询，搜索模式:', searchPattern);
  
  db.query(query, [searchPattern, searchPattern, searchPattern, searchPattern], (err, results) => {
    if (err) {
      console.error('❌ 搜索学生失败：', err);
      res.status(500).json({ 
        error: '搜索失败', 
        details: err.message 
      });
      return;
    }

    console.log(`✅ 搜索完成，找到 ${results.length} 条匹配记录`);

    const formattedStudents = results.map(student => ({
      studentName: `${student.last_name || ''} ${student.first_name || ''}`.trim(),
      oen: formatOEN(student.oen),
      dateOfBirth: formatDate(student.birth_year, student.birth_month, student.birth_day),
      enrollmentDate: formatDate(student.enrollment_year, student.enrollment_month, student.enrollment_day),
      graduationDate: formatDate(student.expected_graduation_year, student.expected_graduation_month, student.expected_graduation_day)
    }));

    res.json(formattedStudents);
  });
});

// 添加一个测试端点来检查数据库连接
app.get('/api/test', (req, res) => {
  console.log('🧪 收到数据库测试请求');
  
  db.query('SELECT 1 as test', (err, results) => {
    if (err) {
      console.error('❌ 数据库测试失败:', err);
      res.status(500).json({ 
        error: '数据库连接测试失败', 
        details: err.message 
      });
      return;
    }
    
    console.log('✅ 数据库连接测试成功');
    res.json({ 
      message: '数据库连接正常', 
      timestamp: new Date().toISOString(),
      result: results[0]
    });
  });
});

// 添加一个检查表结构的端点
app.get('/api/check-table', (req, res) => {
  console.log('🔍 检查students表结构');
  
  db.query('DESCRIBE students', (err, results) => {
    if (err) {
      console.error('❌ 检查表结构失败:', err);
      res.status(500).json({ 
        error: '检查表结构失败', 
        details: err.message 
      });
      return;
    }
    
    console.log('✅ students表结构:', results);
    res.json({ 
      message: 'students表结构', 
      columns: results 
    });
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('💥 服务器错误:', error);
  res.status(500).json({
    error: '服务器内部错误',
    message: error.message
  });
});

// ========================================
// studentmain.html 相关功能
// ========================================

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT} ✅`);
  console.log(`📋 学生数据 API: http://localhost:${PORT}/api/students`);
  console.log(`🔍 搜索 API: http://localhost:${PORT}/api/students/search?q=搜索词`);
  console.log(`🧪 测试 API: http://localhost:${PORT}/api/test`);
  console.log(`📊 表结构检查: http://localhost:${PORT}/api/check-table`);
});