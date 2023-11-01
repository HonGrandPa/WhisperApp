

const rmCheck = $("#checkbox");
const email = $("#email");
const password = $("#password");


if(localStorage.checkbox && localStorage.checkbox != "") {

    rmCheck.attr("checked", "checked");
    email.val(localStorage.username);
    password.val(localStorage.password);
  

} else {

    rmCheck.removeAttr("checked");
    email.val("");
    password.val("");

}


$("#login").on("click", function() {

    console.log($("#email").val());

    if(rmCheck.is(":checked") && email.val() != "" && password.val() != "") {

        localStorage.username = email.val();
        localStorage.password = password.val();
        localStorage.checkbox = rmCheck.val();

        console.log("G");
    } else {

        localStorage.username = "";
        localStorage.password = "";
        localStorage.checkbox = "";
    }
    
});



