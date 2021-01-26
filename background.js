chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.create({url:'dashboard.html'})
   //chrome.tabs.executeScript(null, {file: "script.js"});
   //alert("test")
});
chrome.alarms.create("classroom", {delayInMinutes: 5, periodInMinutes: 10} );

//var token="hi";
//chrome.storage.local.set({token:""})
//alert(token)
/*chrome.identity.getAuthToken({interactive:true,scopes:["classroom.courses.readonly"]},function(token) {
  //token = token
  alert(token)
  chrome.storage.local.set({token:token})
});*/
var error = false
var assignments = []
var courses = [{id:"8350593473",name:"Test"}]
var courseNames = {"8350593473":"Test"}
var getWorkPending = 0;
var lastGetWorks = false;
var gettingWork = false;
var authToken
$.ajaxSettings.traditional = true;


function classroom() {
  console.log("DOING IT")
  gettingWork = true;
  assignments = [];
  lastGetWorks = false;
  getWorkPending = 0;
  error = false;
  courses = []
  courseNames = {}
  chrome.storage.local.get("token",function(data) {
    authToken = data.token;
    if(data.token) {
      $.ajax({
        url:"https://classroom.googleapis.com/v1/courses",
        data:{oauth_token:authToken,courseStates:"ACTIVE"},
        success:function(data) {
          courseNames = {}
          for(let i=0;i<data.courses.length;i++) {
            courseNames[data.courses[i].id] = data.courses[i].name
          }
          courses = data.courses
          getSubmissions()
        },
        error:function(err) {
          console.log(err);
          gettingWork = false;
          //noInternet();
        }
      })
    } else {
      gettingWork = false;
    }
  })

}

function getSubmissions() {
  let allstates = false
  var states = (allstates)?["NEW","CREATED","RETURNED","RECLAIMED_BY_STUDENT","TURNED_IN"]:["NEW","CREATED","RECLAIMED_BY_STUDENT"]
  for(let i=0;i<courses.length;i++) {
    let late = false

    // WILL BE EXECUTED WHEN ALL NOT LATE WORK RETRIEVED
    function done(skip = false) {
      let args = {oauth_token:authToken,states:states,late:"LATE_ONLY"}
      $.ajax({
        url:"https://classroom.googleapis.com/v1/courses/"+courses[i].id+"/courseWork/-/studentSubmissions",
        data:args,
        success:function(data) {
          console.log(data)
          if(data.studentSubmissions) {
            let work = data.studentSubmissions
            for(let j=0;j<work.length;j++) {
              if(j == work.length-1) {
                lastGetWorks = true
                console.log("lastGetWorks")
              }
              getWorkName(work[j].courseWorkId,work[j].courseId,courseNames[work[j].courseId],true);
            }
          }
        },
        error:function(err) {
          console.log(err)
          error = true;
          gettingWork = false;
        }
      });
    }

    // GET ALL NOT LATE OUTSTANDING STUFFs
    function getWork(i,pageToken="") {
      let args = {oauth_token:authToken,states:states,pageSize:10}
      args.pageToken = pageToken

      $.ajax({
        url:"https://classroom.googleapis.com/v1/courses/"+courses[i].id+"/courseWork/-/studentSubmissions",
        data:args,
        success:function(data) {
          console.log(data)
          if(data.studentSubmissions) {
            let work = data.studentSubmissions
            for(let j=0;j<work.length;j++) {
              if(work[j].late == true) {
                done();
                return;
              } else {
                //assignments.push({workId:work.courseWorkId,courseId:work.courseId,courseName:courses[courseId]})
                getWorkName(work[j].courseWorkId,work[j].courseId,courseNames[work[j].courseId]);
              }
            }
          }
          console.log("x")
          if(data.nextPageToken) {
            getWork(i,data.nextPageToken)
          } else {
            done(true);
            return
          }
        },
        error:function(err) {
          late = true
          console.log(err)
          error = true;
        }
      });
    }

    getWork(i)
  }
}

function getWorkName(vworkId,vcourseId,vcourseName,vlate = false) {
  getWorkPending += 1
  let workId = vworkId, courseId = vcourseId, courseName = vcourseName,late = vlate
  $.get("https://classroom.googleapis.com/v1/courses/"+courseId+"/courseWork/"+workId,{oauth_token:authToken},function(data) {
    //console.log(data)
    getWorkPending -= 1
    if(data.dueDate) {
      assignments.push({
        workId:workId,
        courseId:courseId,
        courseName:courseName,
        late:late,
        dueDate:data.dueDate,
        dueTime:data.dueTime,
        link:data.alternateLink,
        title:data.title,
        due:getDueDateStr(data.dueDate,data.dueTime),
        dueInt:getDueDate(data.dueDate,data.dueTime).getTime()
      })
    }
    if(getWorkPending == 0 && lastGetWorks) {
      saveAssignments();
    }
  })
}
function saveAssignments() {
  assignments = assignments.sort(function(a,b) {return ((a.dueInt>b.dueInt)?1:((a.dueInt==b.dueInt)?0:-1))})
  assignments = $.unique(assignments)
  //chrome.storage.local.clear("assignments",function() {
    chrome.storage.local.set({assignments:assignments,lastupdate:new Date().getTime()})
  //});
  gettingWork = false;
  console.log(assignments)
}
chrome.storage.local.set({test:"s"})
classroom();
/*
setInterval(function() {
  classroom();
},1000*60*10)*/
chrome.alarms.onAlarm.addListener(function(alarm) {
  classroom()
})








function th(n) {
  let l = n.toString().split('').pop();
  let end = ""
  if(l == 1) {
    end = "st"
  } else if(l == 2) {
    end = "nd"
  } else if(l == 3) {
    end = "rd"
  } else {
    end = "th"
  }
  return n.toString() + end
}
function getDueDateStr(dueDate,dueTime) {
  var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
  var months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
  months = ["Jan.","Feb.","Mar.","Apr.","May","Jun.","Jul.","Aug.","Sept.","Oct","Nov.","Dec."]
  //months = chrome.i18n.getMessage("shortMonths").split(",")
  //console.log(chrome.i18n.getMessage("shortMonths"),"mONTHS")
  let now = new Date()
  let due = ""
  let dueobj = getDueDate(dueDate,dueTime)

  console.log(dueobj,dueobj.getDate())
  console.log(dueobj.toDateString(),new Date(now.getFullYear(),now.getMonth(),now.getDate()+1).toDateString())
  if(dueobj.toDateString() == now.toDateString()) {
    due = "Today"
  } else if(dueobj.toDateString() == new Date(now.getFullYear(),now.getMonth(),now.getDate()+1).toDateString()) {
    due = "Tomorrow"
  } else if(dueobj.getTime() >= new Date().getTime() && dueobj.getTime() < new Date(now.getFullYear(),now.getMonth(),now.getDate()+7).getTime()) {
    due = days[dueobj.getDay()]
  } else {
    due = months[dueobj.getMonth()] + " " + th(dueobj.getDate());
  }
  if(now.getFullYear() != dueobj.getFullYear()) {
    due += " "+dueobj.getFullYear()
  }
  console.log(dueobj.getHours(),dueobj.getMinutes(),dueobj.getHours() != 23,dueobj.getMinutes() != 59)
  if(dueobj.getHours() != 23 || dueobj.getMinutes() != 59) {
    due += " "+dueobj.getHours()+":"+dueobj.getMinutes()
  }
  return due
}
function getDueDate(date,dat) {
  var due = new Date()
  due.setUTCFullYear(date.year)
  due.setUTCMonth(date.month-1)
  due.setUTCDate(date.day)
  due.setUTCHours(dat.hours)
  due.setUTCMinutes(dat.minutes)
  return due
}
