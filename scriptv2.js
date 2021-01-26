var bg = chrome.extension.getBackgroundPage();
var googleAuth = new OAuth2('google', {
  client_id: '607980826808-gvcqjhckn0jvgku9cms9t3jnro3kh5v6.apps.googleusercontent.com',
  client_secret: 'M2hlEtsYWWNdah3kT3EB4Mls',
  api_scope: 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me'
});
$.ajaxSettings.traditional = true;

function authorize(emptyScrollbox = false) {
  googleAuth.authorize(function() {
    if(emptyScrollbox) {
      $("div.dashboard div.assignments div.scrollbox").empty();
    }
    classroom();
  });
}
var coursenames = {}

function classroom() {
  chrome.storage.local.get(["lastupdates","assignments"],function(data) {
    console.log(data)
    if(!data.lastupdates) {
      data.lastupdates = {}
    }
    if(!data.assignments) {
      data.assignments = []
    }
    var lastupdates = data.lastupdates;
    var newlastupdates = JSON.parse(JSON.stringify(data.lastupdates));
    console.log(newlastupdates)

    var assignments = data.assignments;
    $.get("https://classroom.googleapis.com/v1/courses/",{oauth_token:googleAuth.getAccessToken(),courseStates:"ACTIVE"},function(courses){
      courses = courses.courses;
      console.log(courses)
      searchFinished = courses.length
      for(let i=0;i<courses.length;i++) {
        coursenames[courses[i].id] = courses[i].name
        if(!lastupdates[courses[i].id]) {
          lastupdates[courses[i].id] = 0;
        }
        if(!newlastupdates[courses[i].id]) {
          newlastupdates[courses[i].id] = 0;
        }
        getCourseWork(courses[i].id,assignments,lastupdates,newlastupdates);
      }
    });
  })
}
var stop = false
var searchFinished = 0;
var tokens = []
function getCourseWork(courseId,assignments,lastupdates,newlastupdates,pageToken) {
  var args = {oauth_token:googleAuth.getAccessToken(),orderBy:'updateTime asc',pageSize:2}
  //console.log(pageToken,"token")
  //tokens.push(pageToken)
  if(pageToken) {
    args.pageToken = pageToken
  }
  //console.log(args,"ARARARRARARARAR")
  let continueThis = true
  $.get("https://classroom.googleapis.com/v1/courses/"+courseId+"/courseWork",args,function(courseWork) {
    function finished() {
      searchFinished -= 1;
      console.log(searchFinished)
      console.log(newlastupdates)
      if(searchFinished == 0) {
        console.log(newlastupdates)
        getAssignmentState(assignments,newlastupdates);
      }
    }
    //console.log(courseWork)
    //console.log(searchFinished)
    if($.isEmptyObject(courseWork)) {
      finished()
      return;
    }
    let pageToken = courseWork.nextPageToken;
    //console.log(courseWork,"token")
    console.log(courseWork)
    courseWork = courseWork.courseWork;
    //console.log(courseWork.length,new Date(courseWork[0].updateTime).getTime(),lastupdates[courseWork[0].courseId],courseWork[0].courseId)
    if(courseWork.length >= 1 && new Date(courseWork[0].updateTime).getTime() > lastupdates[courseWork[0].courseId]) {
      if(courseWork[0].workType == "ASSIGNMENT" && courseWork[0].dueDate) {
        /*,due:getDateDue(courseWork[0].dueDate,courseWork[0].dueTime*/
        ///console.log(courseWork[0].dueDate,courseWork[0].dueTime,"S")
        //console.log(coursenames[courseWork[0].courseId],"NAMES")
        assignments.push({courseName:coursenames[courseWork[0].courseId],courseId:courseWork[0].courseId,workId:courseWork[0].id,title:courseWork[0].title,link:courseWork[0].alternateLink,dueDate:courseWork[0].dueDate,dueTime:courseWork[0].dueTime})
      }
      if(newlastupdates[courseWork[0].courseId] < new Date(courseWork[0].updateTime).getTime()) {
        newlastupdates[courseWork[0].courseId] = new Date(courseWork[0].updateTime).getTime()
      }
    } else {
      finished();
      return
    }
    if(courseWork.length == 2 && new Date(courseWork[1].updateTime).getTime() > lastupdates[courseWork[1].courseId]) {
      if(courseWork[1].workType == "ASSIGNMENT" && courseWork[1].dueDate) {
        //console.log(courseWork[1].dueDate,courseWork[1].dueTime,"S")
        //console.log(coursenames[courseWork[1].courseId],"NAMES")
        assignments.push({courseName:coursenames[courseWork[1].courseId],courseId:courseWork[1].courseId,workId:courseWork[1].id,title:courseWork[1].title,link:courseWork[1].alternateLink,dueDate:courseWork[1].dueDate,dueTime:courseWork[1].dueTime})
      }
      if(newlastupdates[courseWork[1].courseId] < new Date(courseWork[1].updateTime).getTime()) {
        newlastupdates[courseWork[1].courseId] = new Date(courseWork[1].updateTime).getTime()
      }
    } else {
      finished();
      return;
    }
    if(stop == false) {
      //console.log(assignments,tokens)
      if(pageToken) {
        getCourseWork(courseWork[0].courseId,assignments,lastupdates,newlastupdates,pageToken);
      } else {
        finished();
      }
    }
  });
}
function getDateDue(date,dat) {
  var due = new Date()
  due.setUTCFullYear(date.year)
  due.setUTCMonth(date.month-1)
  due.setUTCDate(date.day)
  due.setUTCHours(dat.hours)
  due.setUTCMinutes(dat.minutes)
  return due
}
function getAssignmentState(assignments,newlastupdates) {
  console.log(assignments,"assignments")
  let bssignments = JSON.parse(JSON.stringify(assignments));
  console.log(bssignments)
  var last = assignments.length
  if(assignments.length == 0) {
    noAssignments();
    return
  }
  for(let i =0;i<assignments.length;i++) {
    let allstates = true
    var states = (allstates)?["NEW","CREATED","RETURNED","RECLAIMED_BY_STUDENT","TURNED_IN"]:["NEW","CREATED","RETURNED","RECLAIMED_BY_STUDENT"]
    $.get("https://classroom.googleapis.com/v1/courses/"+assignments[i].courseId+"/courseWork/"+assignments[i].workId+"/studentSubmissions",{oauth_token:googleAuth.getAccessToken(),states:states},function(data) {
      console.log(data)
      if(data.studentSubmissions[0].state == "TURNED_IN") {
        //assignments.splice(i,1)
        delete assignments[i]
      } else {
        console.log(assignments[i])
        var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
        var months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
        months = ["Jan.","Feb.","Mar.","Apr.","May","Jun.","Jul.","Aug.","Sept.","Oct","Nov.","Dec."]
        //months = chrome.i18n.getMessage("shortMonths").split(",")
        //console.log(chrome.i18n.getMessage("shortMonths"),"mONTHS")
        let now = new Date()
        let due = ""
        let dueobj = getDateDue(assignments[i].dueDate,assignments[i].dueTime)

        console.log(dueobj,dueobj.getDate())
        if(dueobj.toDateString() == now.toDateString()) {
          due = "Today"
        } else if(dueobj.toDateString() == new Date(now.getFullYear(),now.getMonth()-1,now.getDate()+1).toDateString()) {
          due = "Tomorrow"
        } else if(dueobj.getTime() >= new Date().getTime() && dueobj.getTime() < new Date(now.getFullYear(),now.getMonth()-1,now.getDate()+7).getTime()) {
          due = days[dueobj.getDay()]
        } else {
          due = months[dueobj.getMonth()] + " " + th(dueobj.getDate());
        }
        if(now.getFullYear() != dueobj.getFullYear()) {
          due += " "+dueobj.getFullYear()
        }
        if(now.getTime()>dueobj.getTime()) {
          assignments[i].late = true
        } else {
          assignments[i].late = false
        }
        //assignments[i].state =
        assignments[i].due = due;
        assignments[i].duestr = dueobj.getTime();
      }
      last -= 1
      if(last == 0) {
        assignments = $.grep(assignments,function(n){ return n == 0 || n });
        assignments = assignments.sort(function(a,b) {return ((a.duestr>b.duestr)?1:((a.duestr==b.duestr)?0:-1))})
        chrome.storage.local.set({lastupdates:newlastupdates})
        chrome.storage.local.set({assignments:assignments})
        showAssignments(assignments)
      }
    });
  }
}
function showAssignments(assignments) {
  if(assignments.length == 0) {
    noAssignments();
  }
  for(let i=0;i<assignments.length;i++) {
    $("div.scrollbox").append('<div style="opacity:0" data-href="'+assignments[i].link+'" id="'+i+'" class="assignment'+((assignments[i].late)?" late":"")+'"><span class="class">'+assignments[i].courseName+'</span><span class="due">'+assignments[i].due+'</span><span class="title">'+assignments[i].title+'</span></div>')
    $("div.scrollbox div#"+i).click(function() {
      window.location = $(this).attr("data-href")
    })
    console.log(i)
    $("div.scrollbox div#"+i).delay((i)*100).animate({opacity:1},400)
  }
}
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
function noAssignments() {
  $("div.assignments").append("<div style='opacity:0' class='noassignments'><span class='noassignments'>No Assignments Due!</span><img class='noassignments' src='party.png'></div>")
  $("div.assignments div.noassignments").animate({opacity:1},700).delay(3000).animate({opacity:0},1000)
}
function initBackground(firsttime = false) {
  console.log("INIT BG")
  chrome.storage.local.get(["url","location","color","author","authorurl","origin","originurl"],function(b64) {
    console.log(b64)
    var reinit = false
    if($.isEmptyObject(b64)) {
      reinit = true
    } else {
      $("div.dashboard").css("background-image", "url("+b64.url+")");
      $("div.dashboard").css("pointer-events","auto")
      $("div.dashboard div.credits span.location").text(b64.location)
      $("div.dashboard div.credits a.author").text(b64.author)
      $("div.dashboard div.credits a.author").attr("href",b64.authorurl)
      if(b64.origin) {
        $("div.dashboard div.credits span.seperator").text(" / ")
        $("div.dashboard div.credits a.origin").text(b64.origin)
        $("div.dashboard div.credits a.origin").attr("href",b64.originurl)
      }
      $("<img/>")
      .on('load', function() { $("div.dashboard").animate({opacity:1},1000);console.log("success") })
      .on('error', function() { initBackground(); console.log("error")})
      .attr("src", b64.url);
    }
    //$("div.dashboard").animate({opacity:1},1000);

    chrome.storage.local.get("id",function(data) {
      console.log(data.id)
      $.ajax({
          url: "https://cq.strempfer.works/getnewest/",
          data:{id:data.id},
          method: 'post',
          error: function(){
              console.log("timeout")
              //firstNoInternet();
          },
          success: function(data){
                  //do something

            //console.log(data)
            try {
              data = JSON.parse(data)
            } catch(err) {
              console.log(err);
              return
            }
            if(data.newest == false) {
                // Notify that we saved.
                chrome.storage.local.set(data.photo, function() {
                  console.log("done")
                  //start();
                });
                if(reinit) {
                  initBackground();
                } else {
                  preloadImage();
                }
                //getB64Image(data);
            } else {
              //start();
            }
          },
          timeout: 10000 // sets timeout to 3 seconds
        });
    });
  });
}
function preloadImage() {
  console.log("preloading")
  chrome.storage.local.get("url",function(data) {
    $("body").append("<img class='preload' style='position: absolute;z-index:0;height:1px;left:0px;top:0px;width:1px;display:block' src='"+data.url+"'>")
  });
}
// CLOCK
$(function() {
  var prevtime = 0;
  function setTime() {
    var time = new Date().getHours()+":"+new Date().getMinutes().pad(2);
    if(time != prevtime) {
      $("div.clock").text(time)
    }
    prevtime = time
  }
  setTime();
  setInterval(function() {
    setTime()
  },1000)
})
// ADD LEADING ZEROES TO NUMBER
Number.prototype.pad = function(size) {
      var s = String(this);
      while (s.length < (size || 2)) {s = "0" + s;}
      return s;
    }







if(!localStorage.getItem("notfirsttime")) {
  chrome.storage.local.set({assignments:[],lastupdates:{},author:"Afrah",authorurl:"https://unsplash.com/@ahmedafrah",b64:null,color:"#B8BFCC",id:"UWCIzF2gkdg",location:"Addu City, Maldives",origin:"Unsplash",originurl:"https://unsplash.com",url:"https://images.unsplash.com/photo-1478342469973-477bff68375f?ixlib=rb-0.3.5&q=85&fm=jpg&crop=entropy&cs=srgb&s=4445783d754bde54416bcb03a0e018bb"},function() {
    initBackground(true)
  })
  localStorage.setItem("notfirsttime",true )
} else {
  initBackground();
}
if(googleAuth.hasAccessToken()) {
  authorize();
} else {
  console.log("request login")
  $(function() {
    $("div.dashboard div.assignments div.scrollbox").append('<div class="loginrequest"><span>Classroom Quickview needs permission to access your coursework!</span><button>Authorize</button></div>')
    $("div.dashboard div.assignments div.scrollbox div.loginrequest button").click(function() {
      authorize(true);
    })
  });
}
$(function() {
  $("button.logout").click(function() {
    chrome.storage.local.clear()
    localStorage.clear()
  });
  const container = $("div.assignments div.scrollbox").perfectScrollbar()
})
//authorize();
