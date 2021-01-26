var bg = chrome.extension.getBackgroundPage();
var googleAuth = new OAuth2('google', {
  client_id: '397204605573-scejgmmn0mkjns9qeim3c82q29ss2uaj.apps.googleusercontent.com',
  client_secret: 'yReKcRFQHHPWQmuO2ZOfn7P4',
  api_scope: 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/classroom.coursework.me'
});
$.ajaxSettings.traditional = true;

function authorize(emptyScrollbox = false) {
  googleAuth.authorize(function() {
    chrome.storage.local.set({token:googleAuth.getAccessToken()})
    if(emptyScrollbox) {
      $("div.dashboard div.assignments div.scrollbox").empty();
    }
    $.get("https://www.googleapis.com/oauth2/v1/userinfo?alt=json",{access_token:googleAuth.getAccessToken()},function(data) {
      chrome.storage.local.set({email:data.email,username:data.name,profilepicture:data.picture},function() {
        loggedIn();
      })
    })
    $("div.dashboard div.assignments div.scrollbox div.loginrequest button").off("click")
    $("div.menu span.sendfeedback").css("display","block")
    classroom();

  });
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
function clock(force = false) {
  var prevtime = 0;
  function setTime() {
    let now = new Date()
    if(timeformat == "24") {
      var time = " "+now.getHours()+":"+now.getMinutes().pad(2)
    } else {
      let hours = (now.getHours() > 12)?(now.getHours()-12):now.getHours()
      if(hours == 0) { hours = 12 }

      let ampm = (now.getHours() > 12)?"PM":"AM"
      var time = " "+hours+":"+now.getMinutes().pad(2)+"<span class='ampm'>"+ampm+"</span>"
    }
    //var time = new Date().getHours()+":"+new Date().getMinutes().pad(2);
    if(time != prevtime) {
      $("div.clock").html(time)
    }
    prevtime = time+""
  }
  setTime();
  setInterval(function() {
    setTime()
  },1000)
}
// ADD LEADING ZEROES TO NUMBER
Number.prototype.pad = function(size) {
      var s = String(this);
      while (s.length < (size || 2)) {s = "0" + s;}
      return s;
    }






$(function() {
  chrome.storage.local.get(["timeformat","dateformat"],function(data) {
    timeformat = (data.timeformat)?data.timeformat:"24"
    dateformat = (data.dateformat)?data.dateformat:((chrome.i18n.getUILanguage() == "en-US")?"us":"en")
    clock()
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
      requestLogin();
    }
  })

});
function requestLogin() {
  $("div.dashboard div.assignments div.scrollbox").empty();
  $("div.dashboard div.assignments div.scrollbox").append('<div class="loginrequest"><span>Classroom Quickview needs permission to access your coursework!</span><button>Authorize</button></div>')
  $("div.dashboard div.assignments div.scrollbox div.loginrequest button").click(function() {
    googleAuth = new OAuth2('google', {
      client_id: '397204605573-scejgmmn0mkjns9qeim3c82q29ss2uaj.apps.googleusercontent.com',
      client_secret: 'yReKcRFQHHPWQmuO2ZOfn7P4',
      api_scope: 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/classroom.coursework.me'
    });
    authorize(true);
  })
}
$(function() {
  $("button.logout").click(function() {
    chrome.storage.local.clear()
    localStorage.clear()
  });
  const container = $("div.assignments div.scrollbox").perfectScrollbar()
})

/* TEXTS */

$(function() {
  $("div.menu span.settings-title").text(chrome.i18n.getMessage("settings"))
  $("div.menu div.profile span.logout").html(chrome.i18n.getMessage("logout")+' <i class="icon-logout"></i>')
  $("div.menu span.liveLoad-realtitle").text(chrome.i18n.getMessage("liveLoadTitle"))
  $("div.menu table.liveLoad span.liveLoad.lloff").html(chrome.i18n.getMessage("liveLoadOff"))
  $("div.menu table.liveLoad span.liveLoad.llon").html(chrome.i18n.getMessage("liveLoadOn"))
  $("div.menu span.timeformat-title").html(chrome.i18n.getMessage("timeformatTitle"))
  $("div.menu span.tf12 b").html(chrome.i18n.getMessage("12hours"));
  $("div.menu span.tf24 b").html(chrome.i18n.getMessage("24hours"));
  $("div.menu span.dateformat-title").html(chrome.i18n.getMessage("dateformatTitle"))
  $("div.menu span.dfus b").html(chrome.i18n.getMessage("shortMonths").split(",")[0]+" 1st 2000");
  $("div.menu span.dfde b").html("1 "+chrome.i18n.getMessage("shortMonths").split(",")[0]+" 2000");
  $("span.sendfeedback").html(chrome.i18n.getMessage("feedbackButton")+" <i class='icon-paper-plane'></i>");
  $("span.privacy-info").html('<i class="icon-info-circled"></i>'+chrome.i18n.getMessage("feedbackPrivacyInfo"))
  $("div.feedback input").attr("placeholder",chrome.i18n.getMessage("subject"))
  $("div.feedback textarea").attr("placeholder",chrome.i18n.getMessage("message"))
  $("title").text(chrome.i18n.getMessage("newTab"))
})




$(function() {
  var presses = []
  var valid = [112, 105, 110, 101, 97, 112, 112, 108, 101]
  $(document).keypress(function(e) {
    presses.push(e.keyCode)
    console.log(presses)
    var is = true
    for(let i = 1;i<=9;i++) {
      if(presses[presses.length - 10 + i] != valid[i-1]) {
        is = false
        break;
      }
    }
    if(is) {
      console.log("pineapples!!!");
      $("body div.dashboard").append("<div class='p'></div>")
      $("body div.p").append("<img id='p1' class='p pAni' src='"+img+"'>")
      $("body div.p").append("<img id='p2' class='p pAni' src='"+img+"'>")
      $("body div.p").append("<img id='p3' class='p pAni' src='"+img+"'>")
      $("body div.p").append("<img id='p4' class='p pAni' src='"+img+"'>")
      $("body div.p").append("<img id='p5' class='p pAni' src='"+img+"'>")
      $("img.p").each(function() {
        ani($(this))
        $(this).click(function() {
          console.log($(this).offset().top)
          $(this).css("top",$(this).offset().top)
          $(this).attr("src",img2)
          $(this).removeClass("pAni");
        })
      })
      function ani(that) {
        /*that.delay(Math.random()*10000).animate({top:"100vh"},3000,"linear",function() {
          $(this).css("top","-100px");
          ani($(this))
        })*/
        setTimeout(function() {
          that.css("top","100vh");
          that.css("transform","rotate("+Math.random()*360+"deg)")
          that.css("left","calc("+Math.random()*100+"vw - 55px)")
          setTimeout(function() {
            that.removeClass("pAni");
            setTimeout(function() {
              that.attr("src",img)
              that.css("top","-100px");
              setTimeout(function() {
                that.addClass("pAni");
                ani(that)
              },100);
            },100)
          },3000)
        },Math.random()*2000)
      }
    }
  })
})
var img = `data:image/png;base64,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`

var img2 = `data:image/png;base64,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`
