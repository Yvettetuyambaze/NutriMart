function validateForm() {
    var form = document.forms["myForm"];
    var fname = form["fname"].value;
    var email = form["email"].value;
    var password = form["password"].value;
    var cPass = form["cPass"].value;
    
    if (fname == "" || email == "" || password == "" || cPass == "") {
        alert("All required fields must be filled out");
        return false;
    }
    
    if (password !== cPass) {
        alert("Passwords do not match.");
        return false;
    }
    
    alert("Registration Successful");
    return true;
}

function alt() {
    var input = document.querySelector(".form-control");
    var pass = document.querySelector('#password').value;
    var cPass = document.querySelector("#cPass").value;
    if (input.value.length == 0) {
        alert("Empty input fields");
    } else if (pass != cPass) {
        alert("Passwords do not match.");
        return false;
    } else {
        alert("Registration Successful");
        return true;
    }
}
