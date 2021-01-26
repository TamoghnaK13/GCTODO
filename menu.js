$(function() {
  let close = true;
  var menuScroll = $("div.menu div.scrollcont").perfectScrollbar({scrollYMarginOffset:20})
  $("i.settings").click(function() {
    $("div.menu").animate({marginLeft:0},300);
    setTimeout(function() {
      $('div.menu').on('click.menu', function(e) {
          e.stopPropagation();
      });
      $('div.menu,div.menu .ps__scrollbar-y-rail,div.menu .ps__scrollbar-y').on('mousedown.menu', function(e) {
          e.stopPropagation();
          close = false
          console.log("t")
      });

      $(document).on('click.menu', function (e) {
        if(close == true) {
          $("i.close-settings").click();
        }
        close = true
       // Do whatever you want; the event that'd fire if the "special" element has been clicked on has been cancelled.
      });
    },1)
  })
  $("i.close-settings").click(function() {
    $("div.menu").animate({marginLeft:"-500px"},300);
    $(document).off('click.menu');
    $('div.menu').off('click.menu');
  })
  chrome.storage.local.get("liveLoad",function(data) {
    if(data.liveLoad) {
      $("input[name=liveLoad].on").attr("checked","checked")
    } else {
      $("input[name=liveLoad].off").attr("checked","checked")
    }
  })
  $("input[name=liveLoad]").change(function() {
    if($("input[name=liveLoad]:checked").val() == "on") {
      chrome.storage.local.set({liveLoad:true})
    } else {
      chrome.storage.local.set({liveLoad:false})
    }
    console.log("changed LiveLoad to: "+$("input[name=liveLoad]:checked").val())
  })
  $("span.liveLoad.llon, span.liveLoad.lloff").click(function() {
    $("div.menu table.liveLoad input[name=liveLoad]."+(($(this).hasClass("llon"))?"on":"off")).prop("checked",true)
    $("div.menu table.liveLoad input[name=liveLoad]").change();
  })

  chrome.storage.local.get("timeformat",function(data) {
    if(data.timeformat == 12) {
      $("input[name=timeformat].h12").attr("checked","checked")
    } else {
      $("input[name=timeformat].h24").attr("checked","checked")
    }
  })
  $("input[name=timeformat]").change(function() {
    console.log('trig')
    if($("input[name=timeformat]:checked").val() == "12") {
      timeformat = 12
      chrome.storage.local.set({timeformat:12},function() {
      })
    } else {
      timeformat = 24
      chrome.storage.local.set({timeformat:24},function() {
      })
    }
    console.log("changed timeformat to: "+$("input[name=timeformat]:checked").val())
  })
  $("span.liveLoad.tf12, span.liveLoad.tf24").click(function() {
    $("div.menu table.liveLoad input[name=timeformat]."+(($(this).hasClass("tf12"))?"h12":"h24")).prop("checked",true)
    $("div.menu table.liveLoad input[name=timeformat]").change();
  })

  chrome.storage.local.get("dateformat",function(data) {
    if(data.dateformat == "en") {
      $("input[name=dateformat].en").attr("checked","checked")
    } else {
      $("input[name=dateformat].us").attr("checked","checked")
    }
  })
  $("input[name=dateformat]").change(function() {
    console.log('trig')
    if($("input[name=dateformat]:checked").val() == "us") {
      dateformat = "us"
      chrome.storage.local.set({dateformat:"us"},function() {
      })
    } else {
      dateformat = "en"
      chrome.storage.local.set({dateformat:"en"},function() {
      })
    }
    console.log("changed dateformat to: "+$("input[name=dateformat]:checked").val())
  })
  $("span.liveLoad.dfus, span.liveLoad.dfde").click(function() {
    $("div.menu table.liveLoad input[name=dateformat]."+(($(this).hasClass("dfus"))?"us":"en")).prop("checked",true)
    $("div.menu table.liveLoad input[name=dateformat]").change();
  })




  $("div.feedback i.icon-cancel").click(function() {
    $("div.feedback").css("opacity","0")
    setTimeout(function() {
      $("div.feedback").css("display","none")
    },300);
  })
  $('div.menu span.sendfeedback').click(function() {
    $("div.feedback").css("display","block")
    setTimeout(function() {
      $("div.feedback").css("opacity","1")
    },1);
  })
  var sending = false
  $('div.feedback span.sendfeedback').click(function() {
    if(!sending) {
      sending = true;
      setTimeout(function() {
        sending = false;
      },3000)
      let subject = $("div.feedback input").val();
      let msg = $("div.feedback textarea").val();
      chrome.storage.local.get(["email","username"],function(data) {
        console.log(subject,msg,data.email,data.username)
        if(subject && msg && data.email && data.username) {
          $.post("https://cq.strempfer.works/feedback/",{sender: data.username+" <"+data.email+">",subject:subject,msg:msg},function() {
            $("div.feedback").css("opacity","0")
            setTimeout(function() {
              $("div.feedback").css("display","none")
            },300);
          })
        }
      })
    }
  });
})

function loggedIn() {
  chrome.storage.local.get(["username","email","profilepicture"],function(data) {
    $("div.profile").css("height","65px");
    $("div.profile img").attr("src",data.profilepicture)
    $("div.profile span.username").text(data.username)
    $("div.profile span.email").text(data.email)
    $("div.profile span.logout").click(function() {
      chrome.storage.local.clear()
      /*localStorage.clear()*/
      googleAuth.clearAccessToken();
      requestLogin();
      $("div.menu span.sendfeedback").css("display","none")
      $("div.profile").css("height","0px");
    })
  })
}
