var record_count = 0;
var total_question_cnt = 0;
var question_num = 0;
var passages = [];
fetch_passages_with_retries(3);
var current_question_id = "";
var edit_mode = false;
var annotations = {};
var min_questions = 20;
var num_passages = 5;
var global_timeout = null;
var passage_ids = [];


document.onkeydown = function(event) {
    // on enter press override to create question
    if (event.target.tagName != 'TEXTAREA' && event.keyCode == 13) {
        create_question();
        return false;
    }
}

function get_contents() {
    var passage_data = `Tom falls in love with Becky Thatcher, a new girl in town, and persuades her to get "engaged" by kissing him. But their romance collapses when she learns Tom has been "engaged" previously to Amy Lawrence. Becky cries for a great deal of time until the other students begin to notice, and she becomes embarrassed. Shortly after Becky shuns him, he accompanies Huckleberry Finn to the graveyard at night, where they witness a trio of body snatchers, Dr. Robinson, Muff Potter, and Injun Joe, getting into a fight in which Robinson is murdered by Injun Joe. Tom and Huckleberry Finn swear a blood oath to not tell anyone about the murder, as they feel that if they do, Injun Joe would murder them.
	Natasha visits the Moscow opera, where she meets Hélène and her brother Anatole. Anatole has since married a Polish woman whom he has abandoned in Poland. He is very attracted to Natasha and determined to seduce her, and conspires with his sister to do so. Anatole succeeds in making Natasha believe he loves her, eventually establishing plans to elope. Natasha writes to Princess Maria, Andrei's sister, breaking off her engagement. At the last moment, Sonya discovers her plans to elope and foils them. Natasha learns from Pierre of Anatole's marriage. Devastated, Natasha makes a suicide attempt and is left seriously ill.
	Alex is a 15-year-old living in near-future dystopian England who leads his gang on a night of opportunistic, random "ultra-violence". Alex's friends ("droogs" in the novel's Anglo-Russian slang, 'Nadsat') are Dim, a slow-witted bruiser who is the gang's muscle; Georgie, an ambitious second-in-command; and Pete, who mostly plays along as the droogs indulge their taste for ultra-violence. Characterised as a sociopath and hardened juvenile delinquent, Alex also displays intelligence, quick wit, and a predilection for classical music; he is particularly fond of Beethoven, referred to as "Lovely Ludwig Van". The novella begins with the droogs sitting in their favourite hangout, the Korova Milk Bar, and drinking "milk-plus" — a beverage consisting of milk laced with the customer's drug of choice — to prepare for a night of mayhem. They assault a scholar walking home from the public library; rob a store, leaving the owner and his wife bloodied and unconscious; beat up a beggar; then scuffle with a rival gang. Joyriding through the countryside in a stolen car, they break into an isolated cottage and terrorise the young couple living there, beating the husband and raping his wife.
	In March 1997, Maj. Jack Reacher is briefed by his superior Leon Garber on a troubling development in Carter's Crossing, Mississippi: a woman has been found murdered, her throat slit, with signs of rape, and the military is concerned that one of the potential suspects seems to be Cpt. Reed Riley, a commander at Fort Kelham, a nearby Army Ranger base, with a reputation as a ladykiller. Garber informs Reacher that another MP, Maj. Duncan Munro, has been assigned to investigate the murder; his job is to go undercover and ensure that Munro's investigation doesn't damage the military's public image. He also puts Reacher in touch with Col. James John Frazer, a Senate liaison who warns Reacher that Reed's father, Senator Carlton Riley, a member of the Armed Services Committee, is threatening to impose harsh budget cuts on the army if his son is targeted. Posing as a drifter, Reacher takes up residence in a local inn and goes for a meal, where he meets the local sheriff, Elizabeth Deveraux. A former Marine, she quickly deduces Reacher's true identity and purpose, but permits him to stay as long as he doesn't interfere with her investigation. Reacher does so anyway, and learns that the dead woman, Janice Chapman, was the third woman murdered in Carter's Crossing in just the last few months; the other two were young women from the poorer, largely African American section of town. Reacher's old friend Sgt. Frances Neagley arrives with a warning to stay away from Deveraux, who she claims was dishonorably discharged from the service following an incident with a fellow Marine, but Jack disregards her advice.
	Agnes Grey is the daughter of Mr. Grey, a minister of modest means, and Mrs. Grey, a woman who left her wealthy family and married purely out of love. Mr. Grey tries to increase the family's financial standing, but the merchant he entrusts his money to dies in a wreck, and the lost investment plunges the family into debt. Agnes, her sister Mary, and their mother all try to keep expenses low and bring in extra money, but Agnes is frustrated that everyone treats her like a child. To prove herself and to earn money, she is determined to get a position as a governess. Eventually, she obtains a recommendation from a well-placed acquaintance, is offered a position, and secures her parents' permission. With some misgivings, she travels to Wellwood house to work for the Bloomfield family. The Bloomfields are rich and much crueller than Agnes had expected. Mrs. Bloomfield spoils her children while Mr. Bloomfield constantly finds fault with Agnes's work. The children are unruly and Agnes is held accountable for them despite being given no real authority over them. Tom, the oldest Bloomfield child, is particularly abusive and even tortures small animals. In less than a year, Agnes is relieved of her position, since Mrs. Bloomfield thinks that her children are not learning quickly enough. Agnes returns home.`;
    passage_ids = [577, 41, 363, 767, 318];
    return passage_data.split('\n');
}


function shuffle() {
    for (var i = passages.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = passages[i].trim();
        passages[i] = passages[j].trim();
        passages[j] = temp;
        temp = passage_ids[i];
        passage_ids[i] = passage_ids[j];
        passage_ids[j] = temp;
    }
}

// Check for Bag-of-Words overlap
function bow_overlap(a, b, threshold) {
    var stopwords = new Set(["a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"]);
    var a_withoutpunct = a.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]]/g, "");
    var a_final = a_withoutpunct.replace(/\s{2,}/g, " ");
    a_final = a_final.trim();
    var b_withoutpunct = b.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]]/g, "");
    var b_final = b_withoutpunct.replace(/\s{2,}/g, " ");
    b_final = b_final.trim();
    set1 = new Set(a_final.split(" "));
    var set1_difference = new Set([...set1].filter(x => !stopwords.has(x)));
    set2 = new Set(b_final.split(" "));
    var set2_difference = new Set([...set2].filter(x => !stopwords.has(x)));
    var intersection = new Set([...set1_difference].filter(x => set2_difference.has(x)));

    var overlap = Array.from(intersection);
    var result = overlap.length / Math.max(set1_difference.size, set2_difference.size);
    return (result == threshold);
}


// Get elements matching id regex
function get_elements_by_id_starts_with(container, selector_tag, prefix) {
    var items = [];
    var candidate_el = document.getElementById(container).getElementsByTagName(selector_tag);
    for (var i = 0; i < candidate_el.length; i++) {
        // omitting undefined null check for brevity
        if (candidate_el[i].id.lastIndexOf(prefix, 0) === 0) {
            items.push(candidate_el[i]);
        }
    }
    return items;
}

// Get elements matching class regex
function get_elements_by_class_starts_with(container, selector_tag, prefix) {
    var items = [];
    var candidate_el = document.getElementsByClassName(container)[0].getElementsByTagName(selector_tag);
    for (var i = 0; i < candidate_el.length; i++) {
        if (candidate_el[i] && candidate_el[i].id.lastIndexOf(prefix, 0) === 0) {
            items.push(candidate_el[i]);
        }
    }
    return items;
}

// Attach AI-answer fetch to the question text keyup event
function initialize_answer() {
    document.getElementById('ai-answer').value = 'AI is thinking ...';

    if (global_timeout != null) {
        clearTimeout(global_timeout);
    }

    global_timeout = setTimeout(function() {
        global_timeout = null;
        invoke_bidaf_with_retries(3);
    }, 800);
}

// deselect span type answer
function deselect_span() {
    var span_ind = document.getElementById("span_row").rowIndex;
    var ans_table = document.getElementById("ans_table");
    var span_elements = get_elements_by_id_starts_with("ans_table", "textarea", "span-");

    if (span_elements.length > 0) {
        for (var i = 0; i < span_elements.length; i++) {
            var mark_node = span_elements[i].parentNode.nextSibling;
            if (mark_node && (mark_node.innerText.charCodeAt().toString().includes("10004") ||
                    mark_node.innerText.charCodeAt().toString().includes("10008"))) {
                mark_node.remove();
            }
            span_elements[i].value = "";
            span_elements[i].parentNode.parentNode.style.display = "none";
        }
        document.getElementById("span").checked = false;
    }

    var indices_elements = get_elements_by_id_starts_with("ans_table", "input", "indices-");
    if (indices_elements.length > 0) {
        for (var i = 0; i < indices_elements.length; i++) {
            indices_elements[i].value = "";
        }
    }
    document.getElementById("error_panel").innerText = "";
}

// disable submission button
function disable_button(button_id) {
    document.getElementById(button_id).style.background = "darkgray";
    document.getElementById(button_id).disabled = true;
}

// Edit an already added QA pair
function modify_previous_question() {
    edit_mode = true;
    deselect_span();
    document.getElementById("next_question").innerText = "RE-SUBMIT QUESTION";
    document.getElementById("next_question").disabled = false;
    document.getElementById("next_question").style.background = "#2085bc";

    current_question_id = this.id;

    var tabs = document.getElementsByClassName("rectangles");
    for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].id != this.id) {
            document.getElementById(tabs[i].id).style.pointerEvents = 'none';
        }
    }

    var annotation = annotations[current_question_id];

    if (annotation.answer.checked == "span") {
        document.getElementById("span").checked = true;
        var span_elements = get_elements_by_id_starts_with("ans_table", "textarea", "span-");
        var indices_elements = get_elements_by_id_starts_with("ans_table", "input", "indices-");
        span_elements.sort(sort_by_name);
        indices_elements.sort(sort_by_name);
        for (var i = 0; i < annotation.answer.spans.length; i++) {
            span_elements[i].parentNode.parentNode.style.display = "";
            span_elements[i].value = annotation.answer.spans[i];
            indices_elements[i].value = annotation.answer.indices[i];
            if (i != annotation.answer.spans.length - 1) {
                span_elements[i].parentNode.nextSibling.innerHTML = '<a id="delete_span" href="#" onclick="return delete_span(this);">&#9473;</a>';
            } else {
                span_elements[i].parentNode.nextSibling.innerHTML = '<a id="add_span" href="#" onclick="return add_span(this);">&#10010;</a>';
            }
        }

    } else if (annotation.answer.checked == "no_answer") {
        document.getElementById("no_answer").checked = true;
    }

    document.getElementById("input-question").value = annotation.question;

    document.getElementById('ai-answer').value = 'AI is thinking ...';
    initialize_answer();
}

// Create text for the bottom rectangle tab
function create_text_for_tab() {
    var answer = {
        "spans": [],
        "indices": [],
        "no_answer": false,
        "checked": "",
        "ai_answer": ""
    };
    var empty_qa = false;
    var correct_flag = true;
    var length_flag = true;
    var duplicate_check = false;
    var ai_overlap = true;
    var how_many_const = true;
    var question_el = document.getElementById("input-question");
    if (question_el.value.trim() == "") {
        empty_qa = empty_qa || true;
    }

    var qa_text = "Q: " + question_el.value.trim() + "\nA: ";
    if (document.getElementById("span").checked) {
        var flags = span_match_check();
        var correct_flag = flags.correct_flag;
        var length_flag = flags.length_flag;
        var i_cnt = 0;
        var input_spans = "";
        var input_indices = "";

        var span_elements = get_spans(true);
        for (var i = 0; i < span_elements.length; i++) {
            if (span_elements[i].value.trim() != "") {
                input_spans = input_spans + "[" + span_elements[i].value.trim() + "] ";
                answer.spans.push(span_elements[i].value.trim());
            }
        }

        var indices_elements = get_indices(true);
        for (var i = 0; i < indices_elements.length; i++) {
            if (indices_elements[i].value.trim() != "") {
                input_indices = input_indices + indices_elements[i].value.trim() + " ";
                answer.indices.push(indices_elements[i].value.trim());
            }
        }

        answer.checked = "span";

        if (input_spans.trim() == "") {
            empty_qa = empty_qa || true;
        }

        ai_overlap = bow_overlap(document.getElementById('ai-answer').value, input_spans, 1.0);

        qa_text = qa_text + input_spans + "\nIndices: " + input_indices;
        duplicate_check = duplicate_qa_check(qa_text);

    } else if (document.getElementById("no_answer").checked) {
        answer.no_answer = true;
        answer.checked = "no_answer";
        ai_overlap = document.getElementById('ai-answer').value == null;
        qa_text = qa_text + "[NONE]";
        duplicate_check = duplicate_qa_check(qa_text);
    } else {
        empty_qa = empty_qa || true;
    }

    answer.ai_answer = document.getElementById('ai-answer').value;

    return {
        "qa_text": qa_text,
        "ai_overlap": ai_overlap,
        "empty_qa": empty_qa,
        "correct_text": correct_flag,
        "correct_length": length_flag,
        "duplicate_check": duplicate_check,
        "how_many_const": how_many_const,
        "annotation": answer
    };
}

// Submit the question
function create_question() {
    var annotation = {
        question: "",
        answer: "",
        passage: -1
    };

    annotation.question = document.getElementById("input-question").value;
    annotation.passage = passage_ids[record_count - 1];

    // create the text for the bottom rectangle container containing QA pair
    var result = create_text_for_tab(edit_mode);
    var qa_text = result.qa_text;
    var ai_overlap = result.ai_overlap;
    var empty_qa = result.empty_qa;
    var correct_flag = result.correct_text;
    var length_flag = result.correct_length;
    var duplicate_check = result.duplicate_check;
    var answer = result.annotation;
    var how_many_const = result.how_many_const;

    annotation.answer = answer;
    annotations[current_question_id] = annotation;

    var tab_container = document.getElementsByClassName("horizontal-scroll-wrapper")[0];

    // If all the checks satify
    if (correct_flag && !ai_overlap && !empty_qa && !duplicate_check && how_many_const && length_flag) {

        // Create the bottom tab container if its a new questionand question is new add it
        if (!edit_mode) {
            var new_tab = document.createElement("div");
            new_tab.className = 'rectangles';
            new_tab.id = (record_count - 1) + '-' + question_num;
            new_tab.onclick = modify_previous_question;
            new_tab.innerText = qa_text;
            tab_container.appendChild(new_tab);
            question_num = question_num + 1;
            total_question_cnt = total_question_cnt + 1;
            document.getElementsByClassName("passage_num")[0].innerText = "Passage: " + (record_count) + "/" + passages.length + " Questions: " + (total_question_cnt);
            current_question_id = (record_count - 1) + "-" + question_num;
            // else just modify the text
        } else {
            var curr_tab = document.getElementById(current_question_id);
            curr_tab.innerText = qa_text;
            document.getElementById("input-question").value = "";
        }
        reset();
        check_question_count();
    }

}

function reset() {
    document.getElementById("input-question").value = "";
    document.getElementById("ai-answer").value = "";
    document.getElementById("error_panel").innerText = "";
    document.getElementById("no_answer").checked = false;
    deselect_span();

    disable_button("next_question");
    if (edit_mode) {
        document.getElementById("next_question").innerText = "ADD QUESTION";

        reset_passage_buttons();
        edit_mode = false;
    }
    var tabs = document.getElementsByClassName("rectangles");
    for (var i = 0; i < tabs.length; i++) {
        document.getElementById(tabs[i].id).style.pointerEvents = 'auto';
    }
}

function run_validations_no_answer() {
    deselect_span();
    var result = create_text_for_tab();
    var qa_text = result.qa_text;
    var ai_overlap = result.ai_overlap;
    var empty_qa = result.empty_qa;
    var duplicate_check = result.duplicate_check;

    if (!ai_overlap && !empty_qa && !duplicate_check) {
        document.getElementById("next_question").style.background = "#2085bc";
        document.getElementById("next_question").disabled = false;
        document.getElementById("next_question").title = "";
        document.getElementById("error_panel").innerText = "";
    } else if (empty_qa) {
        disable_button("next_question");
        document.getElementById("next_question").title = "Empty question!";
    } else if (ai_overlap) {
        disable_button("next_question");
        document.getElementById("next_question").title = "AI answer matches true answer. Please try a different question.";
        document.getElementById("error_panel").innerText = "AI answer matches true answer. Please try a different question.";
    } else if (duplicate_check) {
        disable_button("next_question");
        document.getElementById("next_question").title = "Same question-answer pair has already been added.  Please try a different question.";
        document.getElementById("error_panel").innerText = "Same question-answer pair has already been added.  Please try a different question.";
    } else {
        disable_button("next_question");
        document.getElementById("next_question").title = "Something wrong with the answer please try a differenet question.";
        document.getElementById("error_panel").innerText = "Something wrong with the answer please try a differenet question.";
    }
}

// Run span checks on hover
function run_validations_span() {
    var result = create_text_for_tab();
    var qa_text = result.qa_text;
    var ai_overlap = result.ai_overlap;
    var empty_qa = result.empty_qa;
    var correct_flag = result.correct_text;
    var length_flag = result.correct_length;
    var duplicate_check = result.duplicate_check;

    if (correct_flag && !ai_overlap && !empty_qa && !duplicate_check && length_flag) {
        document.getElementById("next_question").style.background = "#2085bc";
        document.getElementById("next_question").disabled = false;
        document.getElementById("next_question").title = "";
        document.getElementById("error_panel").innerText = "";
    } else if (!correct_flag) {
        disable_button("next_question");
        if (document.getElementById("span").checked) {
            document.getElementById("next_question").title = "Please check the spans. The text should match the spans in passage exactly!";
            document.getElementById("error_panel").innerText = "Please check the spans. The text should match the spans in passage exactly!";
        }
    } else if (!length_flag) {
        disable_button("next_question");
        if (document.getElementById("span").checked) {
            document.getElementById("next_question").title = "Please check the length of each span. Try creating a more specific question.";
            document.getElementById("error_panel").innerText = "Please check the length of each span. Try creating a more specific question.";
        }
    } else if (empty_qa) {
        disable_button("next_question");
        document.getElementById("next_question").title = "Empty question or answer or span";
    } else if (ai_overlap) {
        disable_button("next_question");
        document.getElementById("next_question").title = "AI answer matches true answer. Please try a different question.";
        document.getElementById("error_panel").innerText = "AI answer matches true answer. Please try a different question.";
    } else if (duplicate_check) {
        disable_button("next_question");
        document.getElementById("next_question").title = "Same question-answer pair has already been added.  Please try a different question.";
        document.getElementById("error_panel").innerText = "Same question-answer pair has already been added.  Please try a different question.";
    } else {
        disable_button("next_question");
        document.getElementById("next_question").title = "Something wrong with the answer please try a differenet question.";
        document.getElementById("error_panel").innerText = "Something wrong with the answer please try a differenet question.";
    }
}

function duplicate_qa_check(cand_text) {
    cand_text = cand_text.toLowerCase().replace("[", "").replace("]", "");
    cand_text = cand_text.replace("  ", " ").trim();
    var qa_list = document.getElementsByClassName("rectangles");
    for (var i = 0; i < qa_list.length; i++) {
        var curr_text = qa_list[i].innerText.toLowerCase().replace("[", "").replace("]", "");
        curr_text = curr_text.replace("  ", " ").trim();
        if (cand_text == curr_text && qa_list[i].id != current_question_id) {
            return true;
        }
    }
    return false;
}

// Check for 'how many' string in question
function how_many_check() {
    var unit_el = document.getElementById("unit");
    var question_el = document.getElementById("input-question");
    if (question_el.value.toLowerCase().includes("how many") == true) {
        unit_el.disabled = true;
    } else {
        unit_el.value = "";
        unit_el.disabled = false;
    }
}

// Check if answer span overlaps with text in passage
function span_match_check() {
    var correct_flag = new Boolean(true);
    var length_flag = new Boolean(true);

    if (document.getElementById("span").checked) {
        var span_ind = document.getElementById("span_row").rowIndex;
        var ans_table = document.getElementById("ans_table");

        var visible_spans = get_spans(true);
        var count = 0;
        while (count < visible_spans.length) {
            var span_id = "span-" + count;
            if (document.getElementById(span_id)) {
                var span_value = document.getElementById(span_id).value;
                var cur_span_row = document.getElementById(span_id).parentNode.parentNode;
                var passage_str = document.getElementById("input-question").value;
                passage_str = passage_str + document.getElementsByClassName("passage-" + record_count)[0].innerText;
                if (passage_str.includes(span_value) && span_value.trim().split(" ").length <= 5 && span_value != "") {
                    if (cur_span_row.cells.length == 2) {
                        var marker = cur_span_row.insertCell(1);
                        marker.innerHTML = '<p style="color: green;">&#10004;</p>';
                    } else {
                        var marker = cur_span_row.cells[1];
                        marker.innerHTML = '<p style="color: green;">&#10004;</p>';
                    }
                } else if (!passage_str.includes(span_value)) {
                    if (cur_span_row.cells.length == 2) {
                        var marker = cur_span_row.insertCell(1);
                        marker.innerHTML = '<p style="color: red;">&#10008;</p>';
                    } else {
                        var marker = cur_span_row.cells[1];
                        marker.innerHTML = '<p style="color: red;">&#10008;</p>';
                    }
                    correct_flag = correct_flag && false;
                } else if (span_value.trim().split(" ").length > 5) {
                    if (cur_span_row.cells.length == 2) {
                        var marker = cur_span_row.insertCell(1);
                        marker.innerHTML = '<p style="color: red;">&#10008;</p>';
                    } else {
                        var marker = cur_span_row.cells[1];
                        marker.innerHTML = '<p style="color: red;">&#10008;</p>';
                    }
                    length_flag = length_flag && false;
                }
            }
            count = count + 1;
        }
    }
    return {
        "correct_flag": correct_flag,
        "length_flag": length_flag
    };
}

// remove annotation highlights on mouse out
function reset_higlight() {
    var parent = document.getElementsByClassName("passage-sample")[0];
    var span1a = parent.getElementsByClassName("span1a_high");
    var span1b = parent.getElementsByClassName("span1b_high");
    var span2a = parent.getElementsByClassName("span2a_high");
    var span2b = parent.getElementsByClassName("span2b_high");
    var span3a = parent.getElementsByClassName("span3a_high");
    var span34b = parent.getElementsByClassName("span34b_high");
    var span3c = parent.getElementsByClassName("span3c_high");
    var span4a = parent.getElementsByClassName("span4a_high");
    var span6a = parent.getElementsByClassName("span6a_high");
    var span6b = parent.getElementsByClassName("span6b_high");

    if (span1a != 'null') {
        reset_class(span1a, "span1a");
    }
    if (span1b != 'null') {
        reset_class(span1b, "span1a");
    }
    if (span2a != 'null') {
        reset_class(span2a, "span2a");
    }
    if (span2b != 'null') {
        reset_class(span2b, "span2b");
    }
    if (span3a != 'null') {
        reset_class(span3a, "span3a");
    }
    if (span34b != 'null') {
        reset_class(span34b, "span34b");
    }
    if (span3c != 'null') {
        reset_class(span3c, "span3c");
    }
    if (span4a != 'null') {
        reset_class(span4a, "span4a");
    }
    if (span6a != 'null') {
        reset_class(span6a, "span6a");
    }
    if (span6b != 'null') {
        reset_class(span6b, "span6b");
    }
}

// Util class for changing class name to apply css
function reset_class(q_span, class_name) {
    count = q_span.length - 1;
    while (count >= 0) {
        q_span[count].className = class_name;
        count = count - 1;
    }
}

// event on hover over on annotated question
function highlight_q1() {
    var parent = document.getElementsByClassName("passage-sample")[0];
    var q_span = parent.getElementsByClassName("span1a");
    reset_class(q_span, "span1a_high");
    var q_span = parent.getElementsByClassName("span1b");
    reset_class(q_span, "span1b_high");
}

// event on hover over on annotated question
function highlight_q2() {
    var parent = document.getElementsByClassName("passage-sample")[0];
    var q_span = parent.getElementsByClassName("span2a");
    reset_class(q_span, "span2a_high");
    var q_span = parent.getElementsByClassName("span2b");
    reset_class(q_span, "span2b_high");
}

// event on hover over on annotated question
function highlight_q3() {
    var parent = document.getElementsByClassName("passage-sample")[0];
    var q_span = parent.getElementsByClassName("span3a");
    reset_class(q_span, "span3a_high");
    var q_span = parent.getElementsByClassName("span34b");
    reset_class(q_span, "span34b_high");
    var q_span = parent.getElementsByClassName("span3c");
    reset_class(q_span, "span3c_high");
}

// event on hover over on annotated question
function highlight_q4() {
    var parent = document.getElementsByClassName("passage-sample")[0];
    var q_span = parent.getElementsByClassName("span4a");
    reset_class(q_span, "span4a_high");
    var q_span = parent.getElementsByClassName("span34b");
    reset_class(q_span, "span34b_high");
}

// event on hover over on annotated question
function highlight_q5() {
    var parent = document.getElementsByClassName("passage-sample")[0];
    // spans being highlighted are the same as those for Q4
    var q_span = parent.getElementsByClassName("span4a");
    reset_class(q_span, "span4a_high");
    var q_span = parent.getElementsByClassName("span34b");
    reset_class(q_span, "span34b_high");
}

// event on hover over on annotated question
function highlight_q6() {
    var parent = document.getElementsByClassName("passage-sample")[0];
    var q_span = parent.getElementsByClassName("span6a");
    reset_class(q_span, "span6a_high");
    var q_span = parent.getElementsByClassName("span6b");
    reset_class(q_span, "span6b_high");
}

// event on hover over on annotated question
function highlight_q7() {
    var parent = document.getElementsByClassName("passage-sample")[0];
    var q_span = parent.getElementsByClassName("span6a");
    reset_class(q_span, "span6a_high");
    var q_span = parent.getElementsByClassName("span6b");
    reset_class(q_span, "span6b_high");
}

function create_tabs(prefix) {
    var rectangle_containers = [];
    for (var key in annotations) {
        if (key.lastIndexOf(prefix, 0) == 0) {
            rectangle_containers.push(annotations[key]);
        }
    }
}

// switch between next and previous passages
function populate_passage(config) {
    document.getElementById("ready_submit").onclick = null;
    if (record_count <= passages.length) {
        var parent = document.getElementsByClassName("passage")[0];
        var passage_el = document.getElementsByClassName("passage-" + record_count)[0];
        passage_el.remove();
        reset_tabs();

        if (config == "next") {
            record_count = record_count + 1;

        } else {
            record_count = record_count - 1;
        }
        var rect_el = get_elements_by_class_starts_with("horizontal-scroll-wrapper", "div", (record_count - 1) + "-");
        question_num = rect_el.length;

        document.getElementsByClassName("passage_num")[0].innerText = "Passage: " + (record_count) + "/" + passages.length + " Questions: " + (total_question_cnt);
        var new_passage = document.createElement("div");
        new_passage.innerText = passages[record_count - 1];
        new_passage.className = "passage-" + record_count;
        new_passage.style.fontSize = '15px';
        new_passage.setAttribute("id", "passage-display");
        new_passage.setAttribute("onmouseup", "getPassageSelectionIndices()");
        parent.appendChild(new_passage);

        var i = 0;
        while (true) {
            var tab_qa = document.getElementById((record_count - 1) + "-" + i);
            if (!tab_qa) break;
            else {
                tab_qa.style.display = "";
                i = i + 1;
            }
        }
    }
    reset_passage_buttons();
    current_question_id = (record_count - 1) + "-" + question_num;
    document.getElementById("input-question").onkeyup = initialize_answer;
    reset();
    check_question_count();

}

function reset_passage_buttons() {
    if (record_count <= 1) {
        disable_button("prev_passage");
    } else if (record_count == passages.length) {
        disable_button("next_passage");
    } else {
        document.getElementById("next_passage").disabled = false;
        document.getElementById("prev_passage").disabled = false;
        document.getElementById("prev_passage").style.background = "#2085bc";
        document.getElementById("next_passage").style.background = "#2085bc";
    }
}

// Reset element when previous passages control is selected
function reset_tabs() {
    var rectange_el = get_elements_by_class_starts_with("horizontal-scroll-wrapper", "div", (record_count - 1) + "-");
    for (var i = 0; i < rectange_el.length; i++) {
        rectange_el[i].style.display = "none";
    }
}


function resolve_response(response) {
    if (response.status !== 200) {
        console.log('Looks like there was a problem. Status Code: ' +
            response.status);
        document.getElementById('ai-answer').value = "";
        return;
    }

    // Examine the text in the response
    response.json().then(function(data) {
        var ai_answer_container = document.getElementsByClassName("ai_answer")[0];
        var ai_input = document.getElementById('ai-answer');
        ai_input.value = data["best_span_str"];
        return;
    });
}

function error_response() {
    //document.getElementById("ai-answer").value = "Error while fetching AI answer"
    document.getElementById("ai-answer").value = "AI is thinking ...";
}

function invoke_bidaf_with_retries(n) {
    document.getElementById('ai-answer').value = "AI is thinking ...";
    var r = {
        passage: document.getElementsByClassName('passage-' + record_count)[0].innerText,
        question: document.getElementById('input-question').value
    };
    return new Promise(function(resolve, reject) {
        prod_url = "https://sparc-bidaf-server.allenai.org/predict/machine-comprehension";
        dev_url = "https://sparc-bidaf-server.dev.allenai.org/predict";
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

function error_passages() {
    passages = get_contents();
    populate_passage('next');
}

function fetch_passages_with_retries(n) {
    var data_url = "https://s3-us-west-2.amazonaws.com/pradeepd-quoref/data/quoref_passages.json";
    fetch(data_url)
        .then(parse_passages)
        .catch(function(error) {
            if (n === 1) return reject(error_passages);
            fetch_passages_with_retries(n - 1)
                .then(parse_passages)
                .catch(error_passages);
        });
}

// Get all the current spans
function get_spans(visible) {
    var span_elements = get_elements_by_id_starts_with("ans_table", "textarea", "span-");
    var cand_spans = [];
    for (var j = 0; j < span_elements.length; j++) {
        if (visible) {
            if (span_elements[j].parentNode.parentNode.style.display != "none") {
                cand_spans.push(span_elements[j]);
            }
        } else {
            cand_spans.push(span_elements[j]);
        }
    }
    return cand_spans;
}

// Get all the current indices
function get_indices(visible) {
    var span_elements = get_elements_by_id_starts_with("ans_table", "input", "indices-");
    var cand_spans = [];
    for (var j = 0; j < span_elements.length; j++) {
        if (visible) {
            if (span_elements[j].parentNode.parentNode.style.display != "none") {
                cand_spans.push(span_elements[j]);
            }
        } else {
            cand_spans.push(span_elements[j]);
        }
    }
    return cand_spans;
}

// Delete an added span
function delete_span(el) {
    var curr_row = el.parentNode.parentNode;
    var curr_span_id = el.parentNode.parentNode.firstChild.firstChild.id;
    var start_span_id = parseInt(curr_span_id.replace("span-", ""));
    var last_span_id = get_spans(false).length;
    for (var i = start_span_id + 1; i < last_span_id; i++) {
        var curr_span = document.getElementById("span-" + i);
        curr_span.id = "span-" + (i - 1);
        curr_span.name = "span-" + (i - 1);
        var curr_indices = document.getElementById("indices-" + i);
        curr_indices.id = "indices-" + (i - 1);
        curr_indices.name = "indices-" + (i - 1);
    }

    var clone = curr_row.cloneNode(true);

    var curr_value = clone.cells[0].firstChild;
    curr_value.oninput = run_validations_span;
    curr_value.id = "span-" + (i - 1);
    curr_value.name = "span-" + (i - 1);
    curr_value.value = "";
    var curr_indices = clone.cells[0].lastChild;
    curr_indices.id = "indices-" + (i - 1);
    curr_indices.name = "indices-" + (i - 1);
    curr_indices.value = "";

    if (clone.cells.length == 3) {
        clone.deleteCell(1);
    }

    clone.style.display = "none";
    curr_row.remove();
    document.getElementById("ans_table").getElementsByTagName('tbody')[0].appendChild(clone);
    run_validations_span()
    return false;
}

// Add a new answer span
function add_span(el) {
    var ans_table = document.getElementById("ans_table");
    var span_index = el.parentNode.parentNode.rowIndex;
    var span_row_start_index = document.getElementById("span_row").rowIndex;
    var span_elements = get_elements_by_id_starts_with("ans_table", "textarea", "span-");
    var visible_spans = get_spans(true);

    var span_count = visible_spans.length;

    if (!document.getElementById("span-" + span_count)) {
        var span_count = span_index - span_row_start_index;
        var new_row = ans_table.insertRow(span_index + 1);
        var new_cell = new_row.insertCell(0);
        new_cell.innerHTML = '<textarea readonly rows=3 placeholder="Highlight the answer(s) in the passage" id="span-' + span_count + '" name="span-' + span_count + '"></textarea><br><input type="text" readonly id="indices-' + span_count + '">';
        var new_ref = new_row.insertCell(1);
        new_ref.innerHTML = '<a href="#" id="add_span" onclick="return add_span(this);">&#10010;</a>';
        document.getElementById("span-" + span_count).oninput = run_validations_span;
        if (span_count >= 1) {
            var prev_row = ans_table.rows[new_row.rowIndex - 1];
            var row_sub_link = prev_row.cells[prev_row.cells.length - 1];
            row_sub_link.innerHTML = ' <a href="#" id="delete_span" onclick="return delete_span(this);">&#9473;</a>';
        }
    } else {
        document.getElementById("span-" + span_count).parentNode.parentNode.style.display = "";
        document.getElementById("span-" + span_count).parentNode.nextSibling.innerHTML = '<a id="add_span" href="#" onclick="return add_span(this);">&#10010;</a>';
        if (span_count >= 1) {
            el.outerHTML = ' <a href="#" id="delete_span" onclick="return delete_span(this);">&#9473;</a>';
        }
    }

    return false;
}

// Collapse and Expand instructions
function collapse() {
    var annotated_el = document.getElementsByClassName("annotated")[0];
    if (annotated_el.style.display == "none") {
        annotated_el.style.display = "";
        document.getElementById("collapse_link").innerText = "(Click to collapse)";
    } else {
        annotated_el.style.display = "none";
        document.getElementById("collapse_link").innerText = "(Click to expand)";
    }
    return false;
}

function check_question_count() {
    if (total_question_cnt < min_questions) {
        document.getElementById("ready_submit").title = "Must write " + (min_questions - total_question_cnt) + " more questions to submit";

    } else {
        document.getElementById("ready_submit").title = "";
        document.getElementById("ready_submit").disabled = false;
        document.getElementById("ready_submit").onclick = final_submit;
        document.getElementById("ready_submit").style.background = "#2085bc";
        document.getElementById("ready_submit").value = "Ready to Submit";
    }
}

function final_submit() {
    var root = document.getElementById("generated_answers");
    // clear root before we add the answers, in case users double-click
    root.innerHTML = '<div id="generated_answers"></div>';
    for (var j = 0; j < num_passages; j++) {
        var passage_id_el = document.createElement("input");
        passage_id_el.id = "passage-id-" + j;
        passage_id_el.name = "passage-id-" + j;
        passage_id_el.value = passage_ids[j];
        passage_id_el.style.display = 'none';
        passage_id_el.type = "text";
        root.appendChild(passage_id_el);
    }
    for (var key in annotations) {
        var answer = annotations[key].answer;
        var question_el = document.createElement("input");
        question_el.value = annotations[key].question;
        question_el.id = "input-question-" + key;
        question_el.name = "input-question-" + key;
        question_el.type = "text";
        question_el.style.display = 'none';
        root.appendChild(question_el);

        var ai_answer = document.createElement("input");
        ai_answer.id = "ai-answer-" + key;
        ai_answer.name = "ai-answer-" + key;
        ai_answer.type = "text";
        ai_answer.style.display = 'none';
        ai_answer.value = annotations[key].answer.ai_answer;
        root.appendChild(ai_answer);

        if (annotations[key].answer.checked == "span") {
            for (var i = 0; i < annotations[key].answer.spans.length; i++) {
                var span_el = document.createElement("input");
                span_el.id = "span-" + key + "-" + i;
                span_el.name = "span-" + key + "-" + i;
                span_el.type = "text";
                span_el.value = annotations[key].answer.spans[i];
                span_el.style.display = 'none';
                root.appendChild(span_el);
            }
            for (var i = 0; i < annotations[key].answer.indices.length; i++) {
                var indices_el = document.createElement("input");
                indices_el.id = "indices-" + key + "-" + i;
                indices_el.name = "indices-" + key + "-" + i;
                indices_el.type = "text";
                indices_el.value = annotations[key].answer.indices[i];
                indices_el.style.display = 'none';
                root.appendChild(indices_el);
            }
        } else if (annotations[key].answer.checked == "no_answer") {
            var value_el = document.createElement("input");
            value_el.id = "null-" + key;
            value_el.name = "null-" + key;
            value_el.style.display = 'none';
            root.appendChild(value_el);
        }
    }

    var submission_container = document.getElementById("submission_container");
    var submit_button = document.createElement("input");
    submit_button.type = "submit";
    submit_button.className = "btn";
    submit_button.id = 'submitButton';
    submit_button.value = 'Submit HIT';
    submit_button.style.marginLeft = '5%';
    submit_button.enabled = true;

    submission_container.appendChild(submit_button);

    document.getElementById("submission").style.display = "";
    document.getElementById("comment").style.display = "";
}

function parse_passages(response) {
    if (response.status !== 200) {
        console.log('Looks like there was a problem. Status Code: ' +
            response.status);
        error_passages();
        return;
    }

    // Examine the text in the response
    response.json().then(function(data) {
        var all_passages = data["passages"];
        for (var i = 0; i < num_passages; i++) {
            var idx = Math.floor((Math.random() * all_passages.length) + 1);
            passages.push(all_passages[idx]);
            passage_ids[i] = idx;
        }
        populate_passage('next');
    });
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
        var div = document.getElementById("passage-display");
        var selectedText = getSelectedText();
        var start_idx = 0;

        // Iterate through the nodes in div
        var divChildNodes = div.childNodes;
        for (var i = 0; i < divChildNodes.length; i++) {
            childNode = divChildNodes[i];
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
        if (selectionStartIndex != selectionEndIndex) {
            // Update the latest span that isn't set.
            var visible_spans = get_spans(true);
            var visible_indices = get_indices(true);
            if (visible_spans.length > 0) {
                visible_spans.sort(sort_by_name);
                visible_indices.sort(sort_by_name);
                visible_spans[visible_spans.length - 1].value = selectedText;
                visible_indices[visible_indices.length - 1].value = "(" + selectionStartIndex + "," + selectionEndIndex + ")";
                run_validations_span();
            }
        }
    }
}

function sort_by_name(a, b) {
    return a.id.toLowerCase().localeCompare(b.id.toLowerCase());
}
