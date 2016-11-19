$(function(){
    $(".slideshow > div:gt(0)").hide();
    setInterval(function() {
        $('.slideshow > div:first')
            .hide()
            .next()
            .fadeIn(1000)
            .show()
            .appendTo('#slideshow');
    }, 3000);
});
