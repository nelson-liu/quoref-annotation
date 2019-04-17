// Remove any highlighting on spans.
function reset_higlight() {
    var sampleSpans = document.getElementsByClassName("sample-span");
    for (var i = 0; i < sampleSpans.length; i++) {
        sampleSpans[i].classList.remove("highlighted");
    }
}

function highlight_q1() {
    $(".span1a").addClass("highlighted");
    $(".span1b").addClass("highlighted");
}

function highlight_q2() {
    $(".span2a").addClass("highlighted");
    $(".span2b").addClass("highlighted");
}

function highlight_q3() {
    $(".span3a").addClass("highlighted");
    $(".span34b").addClass("highlighted");
    $(".span3c").addClass("highlighted");
}

function highlight_q4() {
    $(".span4a").addClass("highlighted");
    $(".span34b").addClass("highlighted");
}

function highlight_q5() {
    // spans being highlighted are the same as those for Q4
    $(".span4a").addClass("highlighted");
    $(".span34b").addClass("highlighted");
}

function highlight_q6() {
    $(".span6a").addClass("highlighted");
    $(".span6b").addClass("highlighted");
}

function highlight_q7() {
    $(".span7a").addClass("highlighted");
    $(".span7b").addClass("highlighted");
}

function highlight_q10() {
    $(".span10").addClass("highlighted");
}

function highlight_q11() {
    $(".span11a").addClass("highlighted");
    $(".span11b").addClass("highlighted");
}

function highlight_q12() {
    $(".span12a").addClass("highlighted");
    $(".span12b").addClass("highlighted");
}
