//localStorage.setItem("classroomQuickviewIsInstalled","true");
var actualCode = "var classroomQuickviewIsInstalled = true;"

var script = document.createElement('script');
script.textContent = actualCode;
(document.head||document.documentElement).appendChild(script);
script.remove();
