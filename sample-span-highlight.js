// Remove any highlighting on spans.
function reset_higlight() {
    var sampleSpans = document.getElementsByClassName("sample-span");
    for (var i = 0; i < sampleSpans.length; i++) {
        sampleSpans[i].classList.remove("highlighted");
    }
}

function highlight_q1() {
    document.getElementById("span1a").classList.add("highlighted");
    document.getElementById("span1b").classList.add("highlighted");
}

function highlight_q2() {
    document.getElementById("span2a").classList.add("highlighted");
    document.getElementById("span2b").classList.add("highlighted");
}

function highlight_q3() {
    document.getElementById("span3a").classList.add("highlighted");
    document.getElementById("span34b").classList.add("highlighted");
    document.getElementById("span3c").classList.add("highlighted");
}

function highlight_q4() {
    document.getElementById("span4a").classList.add("highlighted");
    document.getElementById("span34b").classList.add("highlighted");
}

function highlight_q5() {
    // spans being highlighted are the same as those for Q4
    document.getElementById("span4a").classList.add("highlighted");
    document.getElementById("span34b").classList.add("highlighted");
}

function highlight_q6() {
    document.getElementById("span6a").classList.add("highlighted");
    document.getElementById("span6b").classList.add("highlighted");
}

function highlight_q7() {
    document.getElementById("span7a").classList.add("highlighted");
    document.getElementById("span7b").classList.add("highlighted");
}

function highlight_q9() {
    document.getElementById("span9a").classList.add("highlighted");
    document.getElementById("span3c").classList.add("highlighted");
    document.getElementById("span9b").classList.add("highlighted");
    document.getElementById("span9c").classList.add("highlighted");
    document.getElementById("span9d").classList.add("highlighted");
}
