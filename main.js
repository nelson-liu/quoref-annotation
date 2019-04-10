// Minimum number of questions to write.
var MIN_QUESTIONS = 10;
// Minimum number of counting questions to write.
var MIN_COUNT_QUESTIONS = 1;
// The number of passages available to the user.
var NUM_PASSAGES = 3;

// Keeps track of whether we're editing a question, and what that question is.
var editing_question = null;

// Keeps track of the index of the current passage (1-indexed).
var currentPassageIndex = 0;
// Keeps track of the total number of questions written.
var total_question_cnt = 0;
// Keeps track of questions that involve counting.
var counting_question_cnt = 0;
// Keeps track of the number of questions written per passage
var question_num = {};
// An array of passages that the user is writing questions about.
var passages = [];
// IDs of the passages above.
var passage_ids = [];

var current_question_id = "";
var annotations = {};
var global_timeout = null;

document.addEventListener("DOMContentLoaded", function() {
    // Initialize question and passage counters
    $('#numQuestionsWritten').text("0/" + MIN_QUESTIONS);
    $('#countQuestionsWritten').text("0/" + MIN_COUNT_QUESTIONS);
    $('#passageNum').text("1/" + NUM_PASSAGES);
    // Fetch and load passages
    fetchPassagesWithRetries(3);
    check_question_count();
});

function get_contents() {
    var passage_data = `Tom falls in love with Becky Thatcher, a new girl in town, and persuades her to get "engaged" by kissing him. But their romance collapses when she learns Tom has been "engaged" previously to Amy Lawrence. Becky cries for a great deal of time until the other students begin to notice, and she becomes embarrassed. Shortly after Becky shuns him, he accompanies Huckleberry Finn to the graveyard at night, where they witness a trio of body snatchers, Dr. Robinson, Muff Potter, and Injun Joe, getting into a fight in which Robinson is murdered by Injun Joe. Tom and Huckleberry Finn swear a blood oath to not tell anyone about the murder, as they feel that if they do, Injun Joe would murder them.
	Natasha visits the Moscow opera, where she meets Hélène and her brother Anatole. Anatole has since married a Polish woman whom he has abandoned in Poland. He is very attracted to Natasha and determined to seduce her, and conspires with his sister to do so. Anatole succeeds in making Natasha believe he loves her, eventually establishing plans to elope. Natasha writes to Princess Maria, Andrei's sister, breaking off her engagement. At the last moment, Sonya discovers her plans to elope and foils them. Natasha learns from Pierre of Anatole's marriage. Devastated, Natasha makes a suicide attempt and is left seriously ill.
	Alex is a 15-year-old living in near-future dystopian England who leads his gang on a night of opportunistic, random "ultra-violence". Alex's friends ("droogs" in the novel's Anglo-Russian slang, 'Nadsat') are Dim, a slow-witted bruiser who is the gang's muscle; Georgie, an ambitious second-in-command; and Pete, who mostly plays along as the droogs indulge their taste for ultra-violence. Characterised as a sociopath and hardened juvenile delinquent, Alex also displays intelligence, quick wit, and a predilection for classical music; he is particularly fond of Beethoven, referred to as "Lovely Ludwig Van". The novella begins with the droogs sitting in their favourite hangout, the Korova Milk Bar, and drinking "milk-plus" — a beverage consisting of milk laced with the customer's drug of choice — to prepare for a night of mayhem. They assault a scholar walking home from the public library; rob a store, leaving the owner and his wife bloodied and unconscious; beat up a beggar; then scuffle with a rival gang. Joyriding through the countryside in a stolen car, they break into an isolated cottage and terrorise the young couple living there, beating the husband and raping his wife.
	In March 1997, Maj. Jack Reacher is briefed by his superior Leon Garber on a troubling development in Carter's Crossing, Mississippi: a woman has been found murdered, her throat slit, with signs of rape, and the military is concerned that one of the potential suspects seems to be Cpt. Reed Riley, a commander at Fort Kelham, a nearby Army Ranger base, with a reputation as a ladykiller. Garber informs Reacher that another MP, Maj. Duncan Munro, has been assigned to investigate the murder; his job is to go undercover and ensure that Munro's investigation doesn't damage the military's public image. He also puts Reacher in touch with Col. James John Frazer, a Senate liaison who warns Reacher that Reed's father, Senator Carlton Riley, a member of the Armed Services Committee, is threatening to impose harsh budget cuts on the army if his son is targeted. Posing as a drifter, Reacher takes up residence in a local inn and goes for a meal, where he meets the local sheriff, Elizabeth Deveraux. A former Marine, she quickly deduces Reacher's true identity and purpose, but permits him to stay as long as he doesn't interfere with her investigation. Reacher does so anyway, and learns that the dead woman, Janice Chapman, was the third woman murdered in Carter's Crossing in just the last few months; the other two were young women from the poorer, largely African American section of town. Reacher's old friend Sgt. Frances Neagley arrives with a warning to stay away from Deveraux, who she claims was dishonorably discharged from the service following an incident with a fellow Marine, but Jack disregards her advice.
	Agnes Grey is the daughter of Mr. Grey, a minister of modest means, and Mrs. Grey, a woman who left her wealthy family and married purely out of love. Mr. Grey tries to increase the family's financial standing, but the merchant he entrusts his money to dies in a wreck, and the lost investment plunges the family into debt. Agnes, her sister Mary, and their mother all try to keep expenses low and bring in extra money, but Agnes is frustrated that everyone treats her like a child. To prove herself and to earn money, she is determined to get a position as a governess. Eventually, she obtains a recommendation from a well-placed acquaintance, is offered a position, and secures her parents' permission. With some misgivings, she travels to Wellwood house to work for the Bloomfield family. The Bloomfields are rich and much crueller than Agnes had expected. Mrs. Bloomfield spoils her children while Mr. Bloomfield constantly finds fault with Agnes's work. The children are unruly and Agnes is held accountable for them despite being given no real authority over them. Tom, the oldest Bloomfield child, is particularly abusive and even tortures small animals. In less than a year, Agnes is relieved of her position, since Mrs. Bloomfield thinks that her children are not learning quickly enough. Agnes returns home.`;
    passage_ids = [577, 41, 363, 767, 318];
    return passage_data.split('\n');
}

function getAIAnswer() {
    document.getElementById('ai-answer').innerText = 'AI is thinking ...';
    if (global_timeout != null) {
        clearTimeout(global_timeout);
    }
    global_timeout = setTimeout(function() {
        global_timeout = null;
        invoke_bidaf_with_retries(3);
    }, 800);
}

function deselect_span() {
    // Deselect the radio button
    $("#span_answer").prop('checked', false);

    // Hide the button for adding more answers
    $("#add_span").hide();

    // Hide all of the currently visible answerCards
    var answersWritten = $('#answersWritten').find('.answerCard');
    for (var i = 0; i < answersWritten.length; i++) {
        answersWritten[i].remove();
    }

    // Clear error panel text, since error might not
    // apply if we switch answer types
    $("#error_panel").text("");
}

function question_has_count_words(question) {
    return question.includes("least") || question.includes("most") || question.includes("once") ||
             question.includes("twice") || question.includes("thrice") || question.includes("times");
}


function deleteQuestion(question_to_delete) {
    // Get the card of the question to edit
    var question_card_to_delete = question_to_delete.parentElement.parentElement;
    // Get the id of the question to delete
    var question_card_to_delete_id = question_card_to_delete.id;

    // Delete the question card and remove its annotation
    question_card_to_delete.remove();
    // Keeping track of question text to handle counting questions count.
    var question_text = annotations[question_card_to_delete_id].question;
    delete annotations[question_card_to_delete_id];

    // Decrement the id of questions answers with IDs higher than the one to delete.
    var startId = parseInt(question_card_to_delete_id.replace(currentPassageIndex + "-question-", ""));
    var endId = $('#questionsWritten').find('.questionCard').length + 1;

    for (var i = startId + 1; i < endId; i++) {
        $("#" + currentPassageIndex + "-question-" + i).prop("id", currentPassageIndex + "-question-" + (i-1));
        $("#" + currentPassageIndex + "-question-" + i + "-text").prop("id", currentPassageIndex + "-question-" + (i-1) + "-text");
        annotations[currentPassageIndex + "-question-" + (i-1)] = annotations[currentPassageIndex + "-question-" + i];
        delete annotations[currentPassageIndex + "-question-" + i];
    }
    total_question_cnt -= 1;
    question_num[currentPassageIndex] -= 1;
    $("#numQuestionsWritten").text(total_question_cnt + "/" + MIN_QUESTIONS);
    if (question_has_count_words(question_text)) {
        counting_question_cnt -= 1;
    }
    $("#countQuestionsWritten").text(counting_question_cnt + "/" + MIN_COUNT_QUESTIONS);
}

// Edit an already added QA pair
function modify_previous_question(question_to_edit) {
    deselect_span();
    $("#next_question").text("Re-submit Question");

    // Get the card of the question to edit
    var editing_question_card = question_to_edit.parentElement.parentElement;
    // Get the id of the question to edit
    editing_question = editing_question_card.id;

    var editing_question_annotation = annotations[editing_question];
    var question_text = editing_question_annotation.question;

    $("#span_answer").prop('checked', true);

    for (var i = 0; i < editing_question_annotation.answer.spans.length; i++) {
        if (i == 0) {
            // Need to call initializeSpanAnswer() on first iteration
            // to add the "Add Answer" button.
            initializeSpanAnswer();
        }
        else {
           addSpan();
        }
        // Fill in the value of the answer card.
        $("#answer-" + i + "-text").text(editing_question_annotation.answer.spans[i]);
        $("#answer-" + i + "-indices").text(editing_question_annotation.answer.indices[i]);
    }
    // Add an extra blank span at the end, so users don't
    // accidentally overwrite their last answer by highlighting.
    addSpan();

    // Fill in the input question box with the the already-written question.
    $("#input-question").val(question_text);
    // Re-run prediction with backend model.
    document.getElementById('ai-answer').innerText = 'AI is thinking ...';
    getAIAnswer();
    if (question_has_count_words(question_text)) {
        // We need to decrement the count here since we will add to it in create_question
        // after editing is done. But we do not change the display of the count here since
        // it can be done after the editing is complete.
        counting_question_cnt -= 1; 
    }
}

// Gather the annotations into a structured format
function getAnswerAnnotations() {
    // The spans and indices (string representation) labeled by the user.
    var answerSpans = [];
    var answerIndices = [];
    // The answer provided by the AI.
    var aiAnswer = document.getElementById('ai-answer').innerText;

    // User provided a span-based answer.
    if (document.getElementById("span_answer").checked) {

        // Get all user-provided answers
        var answersWritten = $('#answersWritten').find('.answerCard');
        for (var i = 0 ; i < answersWritten.length; i ++) {
            var answerId = answersWritten[i].id;
            // Extract the card text and indices
            var answerText = $('#' + answerId + '-text').text();
            if ($.trim(answerText) != "") {
                var indices = $('#' + answerId + '-indices').text();
                answerSpans.push(answerText);
                answerIndices.push(indices);
            }
        }
    }

    return {
        "spans": answerSpans,
        "indices": answerIndices,
        "ai_answer": aiAnswer
    };
}

function create_question_card(question_id) {
    $('#questionsWritten').append('<div class="card mt-2 questionCard" id="' + question_id + '">' +
                                  '<div class="card-body">' +
                                  '<p class="card-text" id="' + question_id + '-text"></p>' +
                                  '<button class="btn btn-primary mr-2" onclick="modify_previous_question(this); return false;">Edit</button>' +
                                  '<button class="btn btn-danger" onclick="deleteQuestion(this); return false;">Delete</button>' +
                                  '</div>' +
                                  '</div>');
}

// Store the question and its answer(s) in a structured form.
function create_question() {
    var annotation = {
        question: $("#input-question").val(),
        answer: getAnswerAnnotations(),
        passageID: passage_ids[currentPassageIndex]
    };

    // create the text for the bottom rectangle container containing QA pair
    var qaText = "Q: " +
            annotation.question +
            "\nA: " +
            JSON.stringify(annotation.answer.spans);

    // If the new_tab_id already exists in annotations, question is being edited,
    // so we have to change the text of the card and increment the associated counters.
    // If the new_tab_id doesn't already exist in annotations, the question is new,
    // so we have to create the card before we modify its text.
    if (editing_question == null) {
        // Initialize counter of number of passages for the question if it
        // hasn't been used yet.
        if (!question_num.hasOwnProperty(currentPassageIndex)) {
            question_num[currentPassageIndex] = 0;
        }
        var new_tab_id = currentPassageIndex + '-question-' + question_num[currentPassageIndex];
        create_question_card(new_tab_id);

        total_question_cnt += 1;
        question_num[currentPassageIndex] += 1;
        $("#numQuestionsWritten").text(total_question_cnt + "/" + MIN_QUESTIONS);
    }
    else {
        var new_tab_id = editing_question;
    }

    // We need to update the count questions counter whether we are editing existing questions,
    // or adding new ones. If we are editing, and the original question already had count words,
    // then we would have decremented the count in modify_previous_question. 
    if (question_has_count_words(annotation.question)) {
        counting_question_cnt += 1;
    }
    $("#countQuestionsWritten").text(counting_question_cnt + "/" + MIN_COUNT_QUESTIONS);

    // Modify the text of the question card
    $('#' + new_tab_id + '-text').text(qaText);

    // Store the annotation, regardless if editing or not.
    annotations[new_tab_id] = annotation;

    resetAnswerEntry();
    check_question_count();
}

function resetAnswerEntry() {
    $("#input-question").val("");
    $("#ai-answer").text("");
    $("#error_panel").text("");

    // Reset editing_question.
    editing_question = null;
    $("#next_question").text("Add Question");
    $("#next_question").prop("disabled", true);

    deselect_span();
}

function isQuestionEmpty() {
    var trimmedQuestion = $.trim($("#input-question").val());

    if (trimmedQuestion.length === 0) {
        return true;
    }
    return false;
}

function isQuestionDuplicate() {
    var trimmedQuestion = $.trim($("#input-question").val());

    for (var questionId in annotations) {
	// If we are editing a question, we need not compare the question with itself.
	// If we are not editing a question, editing_question will be null anyway.
        if (questionId == editing_question) {
            continue; 
        }
        if (questionId.startsWith(currentPassageIndex)) {
            if ($.trim(annotations[questionId].question) === trimmedQuestion) {
                return true;
            }
        }
    }
    return false;
}

function isAnswerLong() {
    var answersWritten = $('#answersWritten').find('.answerCard');
    var mostRecentAnswerId = answersWritten[answersWritten.length - 1].id;
    var mostRecentAnswerText = $('#' + mostRecentAnswerId + '-text').text();
    if ($.trim(mostRecentAnswerText).split(" ").length > 10) {
        return true;
    }
    return false;
}

function isAnswerSameAsAIAnswer() {
    var answersWritten = $('#answersWritten').find('.answerCard');
    if (answersWritten.length > 1) {
        // Assuming that the adversary returns a single span.
        return false;
    }
    var answerId = answersWritten[0].id;
    var answerText = $('#' + answerId + '-text').text();
    var aiAnswer = document.getElementById('ai-answer').innerText;
    if ($.trim(answerText) === $.trim(aiAnswer)) {
        return true;
    }
    return false;
}

function validateAnswers() {
    if (document.getElementById("span_answer").checked) {
        run_validations_span();
    }
}

// Run span checks whenever the predicted answer changes
function run_validations_span() {
    if (isQuestionEmpty()) {
        $("#error_panel").text("This question is empty!");
        $("#add_span").prop("disabled", true);
        $("#next_question").prop("disabled", true);
        return false;
    }
    if (isQuestionDuplicate()) {
        $("#error_panel").text("This question is the same as an existing one!");
        $("#add_span").prop("disabled", true);
        $("#next_question").prop("disabled", true);
        return false;
    }
    if (isAnswerLong()) {
        $("#error_panel").text("The correct answer is too long.");
        $("#add_span").prop("disabled", true);
        $("#next_question").prop("disabled", true);
        return false;
    }
    if (isAnswerSameAsAIAnswer()) {
        $("#error_panel").text("The question is too easy. The AI system correctly answers it.");
        $("#add_span").prop("disabled", false);
        $("#next_question").prop("disabled", true);
        return false;
    }
    // Enable submitting the question.
    $("#error_panel").text("");
    $("#add_span").prop("disabled", false);
    $("#next_question").prop("disabled", false);
    return true;
}

function nextPassage() {
    currentPassageIndex += 1;
    populatePassage(currentPassageIndex);
}

function previousPassage() {
    currentPassageIndex -= 1;
    populatePassage(currentPassageIndex);
}

// switch between next and previous passages
function populatePassage(passageIndex) {
    if (passageIndex < passages.length) {
        // Remove contents of passage box.
        $("#passage").empty();
        // Change the text of the passage box.
        // We use innerText here (as opposed to jquery.text()) because we want
        // to preserve line breaks and the spaces that come with them.
        document.getElementById("passage").innerText = passages[passageIndex];
        // Remove the written questions and replace them with the questions
        // written for the passage we're changing to.
        populateQuestionsWritten(passageIndex);

        // Update the displayed passage number.
        $('#passageNum').text((passageIndex + 1) + "/" + NUM_PASSAGES);

        // Enable or disable next / previous passage buttons as necessary.
        reset_passage_buttons();
        // Reset the answer entry interface
        resetAnswerEntry();
    }
}

function reset_passage_buttons() {
    if (currentPassageIndex < 1) {
        $("#prev_passage").prop("disabled", true);
    }
    else if (currentPassageIndex >= passages.length - 1) {
        $("#next_passage").prop("disabled", true);
    }
    else {
        $("#prev_passage").prop("disabled", false);
        $("#next_passage").prop("disabled", false);
    }
}

// Reset element when previous passages control is selected
function populateQuestionsWritten(passageIndex) {
    // Hide all of the currently visible questionCards
    var questionsWritten = $('#questionsWritten').find('.questionCard');
    for (var i = 0; i < questionsWritten.length; i++) {
        questionsWritten[i].remove();
    }
    // Iterate through questions written for passageIndex and
    // display them.
    for (var questionId in annotations) {
        if (questionId.startsWith(passageIndex)) {
            create_question_card(questionId);
            var qaText = "Q: " +
                    annotations[questionId].question +
                    "\nA: " +
                    JSON.stringify(annotations[questionId].answer.spans);
            // Modify the text of the question card.
            $('#' + questionId + '-text').text(qaText);
        }
    }
}

function invoke_bidaf_with_retries(n) {
    document.getElementById('ai-answer').innerText = "AI is thinking ...";
    var r = {
        passage: document.getElementById('passage').innerText,
        question: document.getElementById('input-question').value
    };
    return new Promise(function(resolve, reject) {
        prod_url = "https://allennlp-bert-qa.apps.allenai.org/predict";
        fetch(prod_url, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(r)
            }).then(resolve_response)
            .catch(function(error) {
                if (n === 1) return reject(error_response);
                invoke_bidaf_with_retries(n - 1)
                    .then(resolve_response)
                    .catch(error_response);
            });
    });
}

function resolve_response(response) {
    if (response.status !== 200) {
        console.log('Looks like there was a problem. Status Code: ' +
                    response.status);
        document.getElementById('ai-answer').innerText = "";
        return;
    }

    // Examine the text in the response
    response.json().then(function(data) {
        var ai_input = document.getElementById('ai-answer');
        ai_input.innerText = data["predictions"];
        // Validate the answers after the prediction is given.
        validateAnswers();
        return false;
    });
}

function error_response() {
    document.getElementById("ai-answer").innerText = "Error while fetching AI answer";
}

function fetchPassagesWithRetries(n) {
    var data_url = "https://s3-us-west-2.amazonaws.com/pradeepd-quoref/data/quoref_passages.json";

    fetch(data_url)
        .then(parsePassages)
        .catch(function(error) {
            if (n === 1) return reject(loadErrorPassages);
            fetchPassagesWithRetries(n - 1)
                .then(parsePassages)
                .catch(loadErrorPassages);
        });
}

function parsePassages(response) {
    if (response.status !== 200) {
        console.log('Looks like there was a problem. Status Code: ' +
                    response.status);
        loadErrorPassages();
        return;
    }

    response.json().then(function(data) {
        var all_passages = data["passages"];
        // Get 3 random passages to show the user.
        for (var i = 0; i < NUM_PASSAGES; i++) {
            var idx = Math.floor((Math.random() * all_passages.length) + 1);
            passages.push(all_passages[idx]);
            passage_ids[i] = idx;
        }
        currentPassageIndex = 0;
        populatePassage(currentPassageIndex);
    });
}

function loadErrorPassages() {
    passages = get_contents();
    currentPassageIndex = 0;
    populatePassage(currentPassageIndex);
}

// Delete an added span
function delete_span(answerToDelete) {
    var cardToDelete = answerToDelete.parentElement.parentElement;
    var cardToDeleteId = cardToDelete.id;
    $("#" + cardToDeleteId).remove();

    // Decrement the id of all answers with IDs higher than the one to delete.
    var startId = parseInt(cardToDeleteId.replace("answer-", ""));
    // Add 1 to endId because we just removed a card.
    var endId = $('#answersWritten').find('.answerCard').length + 1;
    for (var i = startId + 1; i < endId; i++) {
        $("#answer-" + i).prop("id", "answer-" + (i-1));
        $("#answer-" + i + "-body").prop("id", "answer-" + (i-1) + "-body");
        $("#answer-" + i + "-text").prop("id", "answer-" + (i-1) + "-text");
        $("#answer-" + i + "-indices").prop("id", "answer-" + (i-1) + "-indices");
    }
}

function initializeSpanAnswer() {
    // Display the button for adding more answers
    $("#add_span").show();
    // Add the first answer span
    addSpan();
}

// Add a new answer span
function addSpan() {
    var numAnswers = $('#answersWritten').find('.answerCard').length;
    var newAnswerId = "answer-" + numAnswers;
    $('#answersWritten').append('<div class="card mt-2 answerCard" id="' + newAnswerId + '">' +
                                '<div class="card-body" id="' + newAnswerId + '-body">' +
                                '<p class="card-text" id="' + newAnswerId + '-text">' +
                                '</p>' +
                                '<span id="' + newAnswerId + '-indices" style="display:none"></span>' +
                                '</div>' +
                                '</div>');
    // Since we had an answer before, add the delete button to the previous answer
    if (numAnswers >= 1) {
        $("#answer-" + (numAnswers - 1) + '-body').append('<a href="#" class="card-link text-danger" onclick="delete_span(this); return false;">Delete Span</a>');
    }
    // Reset the error panel
    $("#error_panel").text("");
    return false;
}

function check_question_count() {
    if (total_question_cnt < MIN_QUESTIONS || counting_question_cnt < MIN_COUNT_QUESTIONS) {
        // Button is disabled
        $("#ready_submit").prop("disabled", true);
        // Remove btn-success if it exists.
        if ($("#ready_submit").hasClass("btn-success")){
            $("#ready_submit").removeClass("btn-success");
        }
        // Add btn-secondary if it doesn't exist already
        if (!$("#ready_submit").hasClass("btn-secondary")){
            $("#ready_submit").addClass("btn-secondary");
        }
    } else {
        // Button is enabled
        $("#ready_submit").prop("disabled", false);
        // Remove btn-secondary if it exists
        if ($("#ready_submit").hasClass("btn-secondary")){
            $("#ready_submit").removeClass("btn-secondary");
        }
        // Add btn-success if it doesn't exist already
        if (!$("#ready_submit").hasClass("btn-success")){
            $("#ready_submit").addClass("btn-success");
        }
    }
}

function final_submit() {
    annotations['feedback'] = $('#feedback').val();
    var generatedAnswers = $('#generated_answers').val(JSON.stringify(annotations));
    $("#submission_container").show();
    var submitButton = $("#submitButton");
    submitButton.prop("disabled", false);
}

function getSelectedText() {
    var sel, text = "";
    if (window.getSelection) {
        text = "" + window.getSelection();
    } else if ((sel = document.selection) && sel.type == "Text") {
        text = sel.createRange().text;
    }
    return text;
}

function getPassageSelectionIndices() {
    if (window.getSelection) {
        var sel = window.getSelection();
        var div = document.getElementById("passage");
        var selectedText = getSelectedText();
        var start_idx = 0;

        // Iterate through the nodes in div
        var divChildNodes = div.childNodes;
        for (var i = 0; i < divChildNodes.length; i++) {
            var childNode = divChildNodes[i];
            // If it's a linebreak node, increment the start index.
            if (childNode.nodeName == "BR") {
                start_idx += 1;
            }
            if (childNode.nodeName == "#text") {
                // check if this text node is part of the selection
                var childNodeInSelection = sel.containsNode(childNode, true);
                if (childNodeInSelection) {
                    // Get the start index selection
                    if (sel.rangeCount) {
                        var range = sel.getRangeAt(0);
                        var startIndexInNode = range.startOffset;
                        break;
                    }
                } else {
                    var childNodeTextLength = childNode.textContent.length;
                    start_idx += childNodeTextLength;
                }
            }
        }

        var selectionStartIndex = start_idx + startIndexInNode;
        var selectionEndIndex = selectionStartIndex + selectedText.length;
        // Update the text in the last answer card based on the highlight.
        if (selectionStartIndex != selectionEndIndex) {
            var numAnswers = $('#answersWritten').find('.answerCard').length;
            if (numAnswers > 0) {
                var mostRecentAnswer = "answer-" + (numAnswers - 1);
                $("#" + mostRecentAnswer + '-text').text(selectedText);
                $("#" + mostRecentAnswer + '-indices').text("(" + selectionStartIndex + "," + selectionEndIndex + ")");
                // Run validation on the span
                run_validations_span();
            }
        }
    }
}
