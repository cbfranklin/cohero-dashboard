var templates = {};

var counts = {
    "puffTaken": 0,
    "lungFunctionTest": 0
};

var data = {
    "puffTaken": [],
    "lungFunctionTest": []
};

var inProgress = {
    "puffTaken": false,
    "lungFunctionTest": false
};

var chrome = /chrom(e|ium)/.test(navigator.userAgent.toLowerCase());


$(function() {
    if (!chrome) {
        alert('I am designed for use in Google Chrome & Chromium only.');
    }

    /*
    if (localStorage['cohero-events']) {
    data = JSON.parse(localStorage['cohero-events'])
  }
    */

    templates['cohero-queue-item'] = $('.template-cohero-queue-item').html();
    templates['cohero-notification-puffTaken'] = $('.template-cohero-notification-puffTaken').html();
    templates['cohero-notification-lungFunctionTest'] = $('.template-cohero-notification-lungFunctionTest').html();
    templates['cohero-activity-log-item'] = $('.template-cohero-activity-log-item').html();

    var socket = io();
    socket.on('kioskEvent', kioskEventHandler);

});

function kioskEventHandler(msg) {
    console.log('Event Recieved', msg.eventId);
    //console.table(msg);
    addQueueItem(msg);
}

function addQueueItem(item) {
    var type = item.eventType;
    var renderedHTML = Mustache.to_html(templates['cohero-queue-item'], item);
    var $queue = $('.cohero-queue-' + type);
    $queue.append(renderedHTML);

    item.queued = true;
    data[type].push(item);
    counts[type] += 1;

    setTimeout(checkForQueuedItems, 2000, type);

    console.log('Event Queued', item.eventId);
}

function removeQueueItem(id) {
    var $item = $('.cohero-queue-item[data-id="' + id + '"]');
    $item.slideUp();
    setTimeout(function() {
        $item.remove();
    }, 1000);
}

function notifyQueuedItem(item) {
    var type = item.eventType;

    if (type === 'puffTaken') {
        notifyPuffTaken(item);
    }
    if (type === 'lungFunctionTest') {
        notifyLungFunctionTest(item);
    }
}

function sendItemToActivityLog(item){
  console.log('Event Sent to Activity Log', item.eventId);
  var description;
  if(item.eventType === "puffTaken"){
    description = "eMDI Puff";
  }
  if(item.eventType === "lungFunctionTest"){
    description = "Spirometry";
  }
  var renderedHTML = Mustache.to_html(templates['cohero-activity-log-item'], {
    item: item,
    description: description
  });
  $('.cohero-activity-log tbody').append(renderedHTML);
}

function notifyPuffTaken(item) {
    inProgress.puffTaken = true;
    var renderedHTML = Mustache.to_html(templates['cohero-notification-puffTaken'], {
        item: item,
        count: counts.puffTaken
    });
    var $notification = $('.cohero-notification-container-puffTaken');
    $notification.html(renderedHTML).marquisPuffTaken();

    setTimeout(function() {
        inProgress.puffTaken = false;
        checkForQueuedItems('puffTaken');
    }, 6000);
}

function notifyLungFunctionTest(item) {
    inProgress.lungFunctionTest = true;
    var renderedHTML = Mustache.to_html(templates['cohero-notification-lungFunctionTest'], {
        item: item,
        count: counts.lungFunctionTest
    });
    var $notification = $('.cohero-notification-container-lungFunctionTest');
    $notification.html(renderedHTML).marquisLungFunctionTest();

    setTimeout(function() {
        inProgress.lungFunctionTest = false;
        checkForQueuedItems('lungFunctionTest');
    }, 9000);
}

function checkForQueuedItems(type) {
    if (inProgress[type] === false) {
        var found = false;
        var dataOfType = data[type];

        for (var i in dataOfType) {
            if (dataOfType[i].queued === true) {
                var item = dataOfType[i];
                item.queued = false;
                notifyQueuedItem(item);
                sendItemToActivityLog(item);
                removeQueueItem(item.eventId);
                found = true;
                break;
            }
        }

        if (found) {
            setTimeout(checkForQueuedItems, 3000, type);
        }
    }
}



$.fn.marquisPuffTaken = function() {
    var $container = $(this);
    $container.children().hide().eq(0).animateCSS('fadeInWobble', {
        callback: function() {
            $(this).animateCSS('fadeOutDown', {
                delay: 1000,
                callback: function() {
                    $(this).hide();
                }
            });
        }
    });
    setTimeout(function() {
        $container.children().eq(1).animateCSS('fadeInDown', {
            callback: function() {
                $(this).animateCSS('fadeOutUp', {
                    delay: 1000,
                    callback: function() {
                        $(this).hide();
                    }
                });
            }
        });
    }, 3000);
    setTimeout(function() {
        $container.children().eq(0).animateCSS('fadeInUp'/*, {
            callback: function() {
                $(this).animateCSS('fadeOut', {
                    delay: 1000,
                    callback: function() {
                        $(this).hide();
                    }
                });
            }
        }*/);
    }, 6000);
    return this;
};

$.fn.marquisLungFunctionTest = function() {
    var $container = $(this);
    $container.children().hide().eq(0).animateCSS('fadeInWobble', {
        callback: function() {
            $(this).animateCSS('fadeOutDown', {
                delay: 1000,
                callback: function() {
                    $(this).hide();
                }
            });
        }
    });
    setTimeout(function() {
        $container.children().eq(1).animateCSS('fadeInDown', {
            callback: function() {
                $(this).animateCSS('fadeOutUp', {
                    delay: 1000,
                    callback: function() {
                        $(this).hide();
                    }
                });
            }
        });
    }, 3000);
    setTimeout(function() {
        $container.children().eq(2).animateCSS('fadeInUp'/*, {
            callback: function() {
                $(this).animateCSS('fadeOut', {
                    delay: 1000,
                    callback: function() {
                        $(this).hide();
                    }
                });
            }
        }*/);
    }, 6000);
    setTimeout(function() {
        $container.children().eq(2).animateCSS('fadeInUp'/*, {
            callback: function() {
                $(this).animateCSS('fadeOutUp', {
                    delay: 1000,
                    callback: function() {
                        $(this).hide();
                    }
                });
            }
        }*/);
    }, 9000);
    return this;
};
