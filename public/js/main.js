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
}

var chrome = /chrom(e|ium)/.test(navigator.userAgent.toLowerCase());

$(function() {

	if (!chrome) {
        alert('I am designed for use in Google Chrome only.');
    }

    templates['cohero-queue-item'] = $('.template-cohero-queue-item').html();
    templates['cohero-notification-puffTaken'] = $('.template-cohero-notification-puffTaken').html()
    templates['cohero-notification-lungFunctionTest'] = $('.template-cohero-notification-lungFunctionTest').html()

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
    data[type].push(item)
    counts[type] += 1;

    setTimeout(checkForQueuedItems, 2000, type)

    console.log('Event Queued', item.eventId);
}

function removeQueueItem(id) {
    var $item = $('.cohero-queue-item[data-id="' + id + '"]');
    $item.slideUp();
    setTimeout(function() {
        $item.remove();
    }, 1000)
}

function notifyQueuedItem(item) {
    console.log('notifyQueuedItem', item.eventId)
    var type = item.eventType;
    console.log(type)

    if (type === 'puffTaken') {
        notifyPuffTaken(item)
    }
    if (type === 'lungFunctionTest') {
        notifyLungFunctionTest(item)
    }
}

function notifyPuffTaken(item) {
    inProgress.puffTaken = true;
    console.log('notifyPuffTaken')
    var renderedHTML = Mustache.to_html(templates['cohero-notification-puffTaken'], {
        item: item,
        count: counts.puffTaken
    });
    var $notification = $('.cohero-notification-container-puffTaken');
    $notification.html(renderedHTML).marquisPuffTaken();

    setTimeout(function() {
        inProgress.puffTaken = false;
        checkForQueuedItems('puffTaken')
    }, 6000)
}

function notifyLungFunctionTest(item) {
    inProgress.lungFunctionTest = true;
    console.log('notifyLungFunctionTest')
    var renderedHTML = Mustache.to_html(templates['cohero-notification-lungFunctionTest'], {
        item: item,
        count: counts.lungFunctionTest
    });
    var $notification = $('.cohero-notification-container-lungFunctionTest');
    $notification.html(renderedHTML).marquisLungFunctionTest();

    setTimeout(function() {
        inProgress.lungFunctionTest = false;
        checkForQueuedItems('lungFunctionTest')
    }, 9000)
}

function checkForQueuedItems(type) {
    console.log('determining if in progress', type)
    if (inProgress[type] === false) {
        console.log('NOT in progress, checking for queued items')
            //inProgress[type] = true;
        var found = false;
        var dataOfType = data[type];

        for (i in dataOfType) {
            if (dataOfType[i].queued === true) {
                var item = dataOfType[i];
                item.queued = false;
                console.log('Event DeQueued', item.eventId);
                notifyQueuedItem(item)
                removeQueueItem(item.eventId)
                found = true;
                break;
            }
        }

        //inProgress[type] = false;

        if (found) {
            setTimeout(checkForQueuedItems, 3000, type);
        }
    }
    if (inProgress[type] === true) {
        console.log('IN PROGRESS', type)
    }
}


(function($) {
    $.fn.marquisPuffTaken = function() {
        console.log('marquis')
        console.log($(this).children().eq(0))
        var $container = $(this);
        $container.children().hide().eq(0).animateCSS('fadeInUp', {
            callback: function() {
                $(this).animateCSS('fadeOutUp', {
                    delay: 1000,
                    callback: function() {
                        $(this).hide();
                    }
                })
            }
        });
        setTimeout(function() {
            console.log($container.children().eq(1))
            $container.children().eq(1).animateCSS('fadeInUp', {
                callback: function() {
                    $(this).animateCSS('fadeOutUp', {
                        delay: 1000,
                        callback: function() {
                            $(this).hide();
                        }
                    })
                }
            });
        }, 3000)
        return this;
    };
}(jQuery));

$.fn.marquisLungFunctionTest = function() {
    var $container = $(this);
    $container.children().hide().eq(0).animateCSS('fadeInUp', {
        callback: function() {
            $(this).animateCSS('fadeOutUp', {
                delay: 1000,
                callback: function() {
                    $(this).hide();
                }
            })
        }
    });
    setTimeout(function() {
        $container.children().eq(1).animateCSS('fadeInUp', {
            callback: function() {
                $(this).animateCSS('fadeOutUp', {
                    delay: 1000,
                    callback: function() {
                        $(this).hide();
                    }
                })
            }
        });
    }, 3000)
    setTimeout(function() {
        $container.children().eq(2).animateCSS('fadeInUp', {
            callback: function() {
                $(this).animateCSS('fadeOutUp', {
                    delay: 1000,
                    callback: function() {
                        $(this).hide();
                    }
                })
            }
        });
    }, 6000)
    return this;
};
