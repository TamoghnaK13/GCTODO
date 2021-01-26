var error = false
var assignments = []
var courses = [{id:"8350593473",name:"Test"}]
var courseNames = {"8350593473":"Test"}
var getWorkPending = 0;
var lastGetWorks = false;
var timeformat;
var lastupdate
var dateformat;

function classroom() {
  assignments = [];
  getWorkPending = 0;
  lastGetWorks = false;
  error = false;
  chrome.storage.local.get(["liveLoad","lastupdate"],function(data) {
    if(data.liveLoad || typeof data.lastupdate === 'undefined' || data.lastupdate == null || data.lastupdate == undefined) {
      if(!data.liveLoad) {
        bg.classroom();
      }
      $.ajax({
        url:"https://classroom.googleapis.com/v1/courses",
        data:{oauth_token:googleAuth.getAccessToken(),courseStates:"ACTIVE"},
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
          noInternet();
        }
      })
    } else {
      bg.classroom();
      chrome.storage.local.get(["assignments","lastupdate"],function(data) {
        assignments = data.assignments
        lastupdate = data.lastupdate
        showAssignments(true);
      })
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
      let args = {oauth_token:googleAuth.getAccessToken(),states:states,late:"LATE_ONLY"}
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
        }
      });
    }

    // GET ALL NOT LATE OUTSTANDING STUFFs
    function getWork(i,pageToken="") {
      let args = {oauth_token:googleAuth.getAccessToken(),states:states,pageSize:10}
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
  $.get("https://classroom.googleapis.com/v1/courses/"+courseId+"/courseWork/"+workId,{oauth_token:googleAuth.getAccessToken()},function(data) {
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
        title:data.title
      })
    }
    if(getWorkPending == 0 && lastGetWorks) {
      showAssignments()
    }
  })
}
function displayAssignments() {
  console.log(assignments)

}
function showAssignments(fromBG = false) {
  if(assignments.length == 0) {
    noAssignments();
  }
  chrome.storage.local.get("blockedAssignments",function(data) {
    var blockedAssignments = data.blockedAssignments;
    if(!blockedAssignments) {
      blockedAssignments = [];
    }
    var hasLate = [];
    for(let i=0;i<assignments.length;i++) {
      var match = $.grep(blockedAssignments,function(obj) {return (obj.workId == assignments[i].workId && obj.courseId == assignments[i].courseId)})
      console.log("mATCH",match)
      if(match.length == 0) {
        assignments[i].due = getDueDateStr(assignments[i].dueDate,assignments[i].dueTime)
        if(assignments[i].late) {
          hasLate.push(i)
        }
        $("div.scrollbox").append('<div style="opacity:0" data-href="'+assignments[i].link+'" id="'+i+'" class="assignment'+((assignments[i].late)?" late":"")+'"><span class="class">'+assignments[i].courseName+'</span><span class="due">'+assignments[i].due+'</span><span class="title">'+assignments[i].title+'</span><i class="icon-cancel block-assignment"></i></div>')
        $("div.scrollbox div#"+i).click(function() {
          window.location = $(this).attr("data-href")
        })

        // ALL = BLOCK ASSIGNEMT
        $("div.scrollbox div#"+i+" i.block-assignment").click(function(e) {
          blockAssignment(e,i)
        });
        function blockAssignment(e,j=false,save=true,deleteArray=false) {
          if(j !== false) {
            var i = j;
            console.log("RESET")
          }
          if(e !== false) {
            e.stopPropagation();
          }
          console.log(assignments[i])
          if(save) {
            chrome.storage.local.get("blockedAssignments",function(data) {
              console.log(assignments,i,"LOG")
              var blockedAssignments = data.blockedAssignments;
              if(!blockedAssignments || !Array.isArray(blockedAssignments)) {
                blockedAssignments =[];
              }
              if(deleteArray !== false) {
                for(let i in deleteArray) {
                  blockedAssignments.push({courseId:assignments[deleteArray[i]].courseId,workId:assignments[deleteArray[i]].workId})                
                }
              } else {
                blockedAssignments.push({courseId:assignments[i].courseId,workId:assignments[i].workId})
              }
              chrome.storage.local.set({blockedAssignments})
            })
          }
          let stopit = false;
          $("div.scrollbox div#"+i).css("height",$("div.scrollbox div#"+i).height()+"px")
          $("div.scrollbox div#"+i).empty().append("<span class='blockAssignment' style='line-height:"+$("div.scrollbox div#"+i).height()+"px'>"+chrome.i18n.getMessage("blockAssignmentMsg")+"<span class='undoBlock'>Undo</span></span>")
          $("div.scrollbox div#"+i+" span.undoBlock").click(function(ev) {
            ev.stopPropagation();
            stopit = true;
            chrome.storage.local.get("blockedAssignments",function(data) {
              var blockedAssignments = data.blockedAssignments;
              if(blockedAssignments && Array.isArray(blockedAssignments)) {
                var data = $.grep(blockedAssignments, function(e){
                     return e.workId != assignments[i].workId;
                });
                chrome.storage.local.set({blockedAssignments:data})
              }
              $("div.scrollbox div#"+i).empty().append('<span class="class">'+assignments[i].courseName+'</span><span class="due">'+assignments[i].due+'</span><span class="title">'+assignments[i].title+'</span><i class="icon-cancel block-assignment"></i>');
              $("div.scrollbox div#"+i+" i.block-assignment").click(function(e) {
                blockAssignment(e,i)
              })
            })
          })
          setTimeout(function() {
            if(!stopit) {
              $("div.scrollbox div#"+i+" span.undoBlock").off('click')
              $("div.scrollbox div#"+i).css("opacity",0);
              $("div.scrollbox div#"+i).css("height",$("div.scrollbox div#"+i).height()+"px")
              setTimeout(function() {
                $("div.scrollbox div#"+i).css("height","0px");
                $("div.scrollbox div#"+i).css("margin","0px");
                $("div.scrollbox div#"+i).css("padding","0px");
                setTimeout(function() {
                  $("div.scrollbox div#"+i).remove();
                },500)
              },500);
            }
          },3000);
        }


        console.log(i)
        $("div.scrollbox div#"+i).delay((i)*100).animate({opacity:1},400)
      }
    }
    if(hasLate.length > 0) {
      console.log("add")
      $("div.assignments").append("<span class='removeLate'>"+chrome.i18n.getMessage("blockLateWork")+"</span>");
      $("div.assignments span.removeLate").click(function() {
        console.log(assignments)
        for(let i in hasLate) {
          console.log(hasLate[i])
          blockAssignment(false,hasLate[i],(i == hasLate.length-1)?true:false,hasLate)
        }
        //$(this).remove();
      })
    }
  })
  if(fromBG) {
    var dobj = new Date(lastupdate);
    var color = "#f00"
    var now = new Date();
    console.log(now.getTime() - lastupdate)
    if((new Date().getTime() - lastupdate) < 1000*60*10) {
      // LAST UPDATE LESS THAN 10 MINUTES AGO
      color = "#0f0"
    } else if(new Date().getTime() - lastupdate < 1000*60*60*2) {
      // LAST UPDATE LESS THAN 2 HOURS AGO
      color = "#f80"
    }
    $("<span class='lastupdate'><i class='icon-arrows-cw' style='color:"+color+";opacity:0.5;font-size:16px;'></i>"+getDueDateStr({},{},dobj)+"</span>").insertBefore("div.scrollbox")
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
function getDueDateStr(dueDate,dueTime,dueobject=false) {
  var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
  days = chrome.i18n.getMessage("days").split(",")
  var months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
  months = ["Jan.","Feb.","Mar.","Apr.","May","Jun.","Jul.","Aug.","Sept.","Oct.","Nov.","Dec."]
  months = chrome.i18n.getMessage("shortMonths").split(",")
  console.log(chrome.i18n.getMessage("shortMonths"))
  chrome.i18n.getAcceptLanguages((langs) => {
    console.log(langs,chrome.i18n.getUILanguage())
  })
  console.log(dueobject)
  //console.log(chrome.i18n.getMessage("shortMonths"),"mONTHS")
  let now = new Date()
  let due = ""
  let dueobj
  if(!dueobject) {
    dueobj = getDueDate(dueDate,dueTime)
  } else {
    dueobj = dueobject
  }

  console.log(dueobj,dueobj.getDate())
  if(dueobj.toDateString() == now.toDateString()) {
    due = chrome.i18n.getMessage("today")
  } else if(dueobj.toDateString() == new Date(now.getFullYear(),now.getMonth(),now.getDate()+1).toDateString()) {
    due = chrome.i18n.getMessage("tomorrow")
  } else if(dueobj.getTime() >= new Date().getTime() && dueobj.getTime() < new Date(now.getFullYear(),now.getMonth(),now.getDate()+7).getTime()) {
    due = days[dueobj.getDay()]
  } else {
    if(dateformat == "us") {
      due = months[dueobj.getMonth()] + " " + th(dueobj.getDate());
    } else {
      due = dueobj.getDate()+" "+months[dueobj.getMonth()]
    }
  }
  if(now.getFullYear() != dueobj.getFullYear()) {
    due += " "+dueobj.getFullYear()
  }
  if(dueobj.getHours() != 23 || dueobj.getMinutes() != 59) {
    if(timeformat == "24") {
      due += " "+dueobj.getHours()+":"+dueobj.getMinutes().pad(2)
    } else {
      let hours = ((dueobj.getHours() > 12)?(dueobj.getHours()-12):dueobj.getHours())
      if(hours == 0) { hours = 12 }
      let ampm = (dueobj.getHours() > 12)?"pm":"am"
      due += " "+hours+":"+dueobj.getMinutes().pad(2)+ampm
    }
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
