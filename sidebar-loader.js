// sidebar-loader.js

document.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById("sidebar-container");
  
    if (container) {
      fetch("sidebar.html")
        .then(response => {
          if (!response.ok) {
            throw new Error("Failed to load sidebar");
          }
          return response.text();
        })
        .then(html => {
          container.innerHTML = html;
  
          // 高亮当前页面的链接（根据 URL）
          const links = container.querySelectorAll("a");
          links.forEach(link => {
            if (window.location.href.includes(link.getAttribute("href"))) {
              link.classList.add("active");
            }
          });
        })
        .catch(error => {
          console.error("Error loading sidebar:", error);
          container.innerHTML = "<p style='color: red;'>Sidebar failed to load.</p>";
        });
    }
  });