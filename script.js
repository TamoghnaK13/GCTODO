
var bg = chrome.extension.getBackgroundPage();
/*chrome.storage.local.get("token",function(data) {
  console.log(bg.token,data.token)
  if(!data.token || data.token == "") {

  }
})*/
/*var googleAuth = new OAuth2('google', {
  client_id: '607980826808-ganncvfnc5r8csio9rct0g61n6u10v04.apps.googleusercontent.com',
  client_secret: 'lO5FBAhHYxL5OUnEdXWaDXSe',
  api_scope: 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me'
});*/
var googleAuth = new OAuth2('google', {
  client_id: '607980826808-gvcqjhckn0jvgku9cms9t3jnro3kh5v6.apps.googleusercontent.com',
  client_secret: 'M2hlEtsYWWNdah3kT3EB4Mls',
  api_scope: 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me'
});
function authorize() {
  //googleAuth.clearAccessToken();
  googleAuth.authorize(function() {
    // Ready for action
    start();

    //alert(googleAuth.getAccessToken())
  });
}
$(function() {
authorize();
});
$(function() {
  $("button").click(function() {
    googleAuth.clearAccessToken();
  })
})
function start() {
  console.log("start")
  var b64 = chrome.storage.local.get(["url","location","color","author","authorurl","origin","originurl"],function(b64) {
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
    $("div.dashboard").animate({opacity:1},1000);
  });
}
$(function() {
  setInterval(function() {
    setTime()
  },1000)
  function setTime() {
    $("div.clock").text(new Date().getHours()+":"+new Date().getMinutes())
  }
  setTime()
})
//chrome.storage.local.set({storedwork:[{work:"s",course:"S"}]})
function getCourseWork() {
  //console.log(new Date(2017,8,23,23,59))
  var coursework = []
  var classnames = []
  $.get("https://classroom.googleapis.com/v1/courses/",{oauth_token:googleAuth.getAccessToken(),courseStates:"ACTIVE"},function(data){
    console.log(data)
    var callbackcount = 0;
    if(data.courses.length == 0) {
      noClasses();
    }
    var coursescount = data.courses.length;
    var addtostoredwork = [];
    chrome.storage.local.get("storedwork",function(storedwork) {
      console.log(storedwork)
      storedwork = storedwork.storedwork
      //storedwork = JSON.parse(storedwork.storedwork)
      try {
        coursescount += storedwork.length
      } catch(err) {
        storedwork = []
      }
      for(var w=0;w<storedwork.length;w++) {
        let thiswork = storedwork[w];
        $.get("https://classroom.googleapis.com/v1/courses/"+storedwork[w].course+"/courseWork/"+storedwork[w].work,{oauth_token:googleAuth.getAccessToken()},function(date) {
          //console.log(date,"S")
          handleResponse(date,true);
        }).fail(function(err) {
          console.log(err)
          if(err.status == 404) {
            chrome.storage.local.get("storedwork",function(d) {
              d.storedwork = $.grep(d.storedwork, function(data, index) {
                console.log(data.work, thiswork.work , data.course , thiswork.course)
                 return data.work != thiswork.work && data.course != thiswork.course
              });
              console.log(d.storedwork)
              chrome.storage.local.set({storedwork:d.storedwork})
            })
          }
        });
      }
      for(var i=0;i<data.courses.length;i++) {
        var course = data.courses[i]
        classnames.push({id:data.courses[i].id,title:data.courses[i].name})
        if(course.courseState == "ACTIVE") {
          //console.log(data.courses[i])
          $.get("https://classroom.googleapis.com/v1/courses/"+course.id+"/courseWork",{oauth_token:googleAuth.getAccessToken(),orderBy:'updateTime asc',pageSize:10},function(date) {
            handleResponse(date);
          });


        }
      }
      function handleResponse(date,storedwork=false) {
        //console.log(date)
        var courseWork = date.courseWork;
        //console.log(date.courseWork)
        let thisstoredwork = !!storedwork
        coursescount -= 1;
        /*if(coursescount <= 0 && !date.courseWork) {
          noAssignments();
        }*/
        try {courseWork.length} catch(err) { return }
        for(var j=0;j<courseWork.length;j++) {
          if(courseWork[j].dueDate) {
            //console.log(courseWork[j].dueDate)
            //console.log(courseWork[j])
            var work = courseWork[j]
            var hour = "23"
            var minute = "59"
            if(work.dueTime) {
              hour = work.dueTime.hours
              minute = work.dueTime.minutes
            }
            console.log(work.dueTime)
            //var due = new Date(work.dueDate.year,work.dueDate.month-1,work.dueDate.day-1,hour,minute)
            var due = new Date()
            due.setUTCFullYear(work.dueDate.year)
            due.setUTCMonth(work.dueDate.month-1)
            due.setUTCDate(work.dueDate.day)
            due.setUTCHours(hour)
            due.setUTCMinutes(minute)
            console.log(due.getTimezoneOffset())
            var classname = classnames.find((obj)=>{return obj.id == courseWork[j].courseId}).title
            var link = work.alternateLink;
            console.log(thisstoredwork)
            coursework.push({due:due,id:courseWork[j].id,title:courseWork[j].title,state:"DONE",late:false,classname:classname,link:link})
            if(due.getTime()<new Date().getTime()) {
              coursework[coursework.length-1].late = true
            }
            console.log(courseWork[j])
            callbackcount += 1;
            $.ajaxSettings.traditional = true;
            var states = (storedwork)?["NEW","CREATED","RETURNED","RECLAIMED_BY_STUDENT","TURNED_IN"]:["NEW","CREATED","RETURNED","RECLAIMED_BY_STUDENT"]
            $.get("https://classroom.googleapis.com/v1/courses/"+date.courseWork[j].courseId+"/courseWork/"+date.courseWork[j].id+"/studentSubmissions",{oauth_token:googleAuth.getAccessToken(),states:states},function(dat) {
              try {
                var subm = dat.studentSubmissions[0];
                console.log(subm)
                if(subm.state != "TURNED_IN") {
                  coursework.find((obj)=>{return obj.id == subm.courseWorkId}).state = "TODO"
                  if(thisstoredwork == false) {
                    addtostoredwork.push({work:subm.courseWorkId,course:subm.courseId})
                  }
                  //console.log(coursework)
                } else {
                  if(thisstoredwork) {
                    chrome.storage.local.get("storedwork",function(d) {
                      d.storedwork = $.grep(d.storedwork, function(data, index) {
                         return data.work != subm.courseWorkId && data.course != subm.courseId
                      });
                      console.log(d.storedwork)
                      chrome.storage.local.set({storedwork:d.storedwork})
                    })
                  }
                }
              } catch(err) {

              }
              callbackcount -= 1;

              if(callbackcount == 0) {
                chrome.storage.local.get("storedwork",function(d) {
                  d.storedwork = d.storedwork.concat(addtostoredwork)
                  console.log(d.storedwork,addtostoredwork)
                  chrome.storage.local.set({storedwork:d.storedwork})
                })
                if(coursework.length == 0) {
                  noAssignments();
                } else {
                  listAssignments(coursework);
                }
              }
            })
          }
        }
      }
    })
  })
}
function noAssignments() {
  $("div.assignments").append("<span class='noassignments'>No Assignments Due!</span><img class='noassignments' src='party.png'>")
}
function noClasses() {
  alert("none")
}
function listAssignments(coursework) {
  console.log(coursework,"CW")
  coursework.sort((a,b)=> {
    if(a.due < b.due) {
      return -1;
    }
    if(a.due > b.due) {
      return 1;
    }
    return 0;
  })
  var posted = false
  var donework = []
  for(var i=0;i<coursework.length;i++) {
    if(coursework[i].state == "TODO") {
      posted = true;
      var late = "";
      if(coursework[i].late) {
        late = " late";
      }
      $("div.assignments div.scrollbox").append("<div class='assignment"+late+"' style='opacity: 0' data-link='"+coursework[i].link+"' id='"+coursework[i].id+"'><span class='title'>"+coursework[i].title+"</span></div>");
      var assignment = $("div.assignments div.assignment#"+coursework[i].id);
      var due = new Date(coursework[i].due);
      var today = new Date();
      var nextWeek = new Date(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7));
      var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
      console.log(due)
      if(due.getTime() < nextWeek.getTime() && due.getTime() > today.getTime()) {
        var dued = days[due.getDay()]
      } else {
        var dued = due.toLocaleDateString();
      }
      var duet = ""
      if(!(due.getHours() == 23 && due.getMinutes() == 59)) {
        duet = due.getHours()+":"+due.getMinutes()
      }
      //console.log(assignmet.find("span.due"))
      //if(assignmet.find("span.due").length == 0) {
      console.log(coursework[i])
      if(donework.indexOf(coursework[i].link) < 0) {
        donework.push(coursework[i].link)
        assignment.append('<span class="due" id="'+coursework[i].id+'">'+dued+' '+duet+'</span>')
        assignment.append('<span class="class" id="'+coursework[i].id+'">'+coursework[i].classname+'</span>')

        assignment.click(function() {
          window.location = $(this).attr("data-link")
        })
      }
      //setTimeout(function() {
      console.log(i)
        assignment.delay((i-1)*100).animate({opacity:0.9},400)
      //},i*500);
    }
  }
  //new SimpleBar($('div.assignments div.scrollbox')[0])
  const container = $("div.assignments div.scrollbox").perfectScrollbar()
//Ps.initialize(container);

  if(posted == false) {
    noAssignments();
  }
}
start()
  getCourseWork();
  chrome.storage.local.get("id",function(data) {
    console.log(data.id)
    $.ajax({
        url: "https://cq.strempfer.works/getnewest/",
        data:{id:data.id},
        method: 'post',
        error: function(){
            console.log("timeout")
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
              preloadImage();
              //getB64Image(data);
          } else {
            //start();
          }
        },
        timeout: 10000 // sets timeout to 3 seconds
      });
  });
function preloadImage() {
  console.log("preloading")
  chrome.storage.local.get("url",function(data) {
    $("body").append("<img class='preload' style='position: absolute;z-index:0;height:1px;left:0px;top:0px;width:1px;display:block' src='"+data.url+"'>")
  });
}
function getB64Image(data) {
    console.log('new data image saved. Loading image');
    var xhr = new XMLHttpRequest();
    console.log(data.photo.url)
    xhr.open('GET', data.photo.url);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function(r) {
        if (xhr.status != 200) {
            return;
        }
          //chrome.storage.local.set('data:image/jpg;base64,' + btoa(String.fromCharCode.apply(null, new Uint8Array(xhr.response))),function(){})
          chrome.storage.local.set({image:'data:image/jpg;base64,'+arrayBufferToBase64(xhr.response)},function(){})
            chrome.storage.local.set(data.photo, function() {
              console.log("done")
              //start();
            });
    }
    xhr.send();
}
function arrayBufferToBase64( buffer ) {
  console.log("EVRYDAY I'M BUFFERING")
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    console.log("NOT ANYMORE!")
    return window.btoa( binary );
}
$(function() {
})
