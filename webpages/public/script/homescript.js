function validateForm(e) {
    $('#getTouchForm').form({
        fields: {
            fName: {
                identifier: 'fName',
                rules: [
                    {
                        type: 'empty',
                        prompt: 'Please enter First Name.'
                    },
                    {
                        type: 'doesntContain[<]',
                        prompt: 'Please enter a Valid First Name.'
                    }
                ]
            },
            lName: {
                identifier: 'lName',
                rules: [
                    {
                        type: 'empty',
                        prompt: 'Please enter Last Name.'
                    },
                    {
                        type: 'doesntContain[<]',
                        prompt: 'Please enter a Valid Last Name.'
                    }
                ]
            },
            eAddress: {
                identifier: 'eAddress',
                rules: [
                    {
                        type: 'empty',
                        prompt: 'Please enter Email.'
                    },
                    {
                        type: 'email',
                        prompt: 'Please enter a valid email.'
                    }
                ]
            },
            phone: {
                identifier: 'phone',
                rules: [
                    {
                        type: 'empty',
                        prompt: 'Please enter Contact No.'
                    },
                    {
                        type: 'number',
                        prompt: 'Please enter a valid contact No.'
                    },
                    {
                        type: 'exactLength[10]',
                        prompt: 'Please enter a valid contact No.'
                    }
                ]
            },
            subject: {
                identifier: 'subject',
                rules: [
                    {
                        type: 'empty',
                        prompt: 'Please select a subject.'
                    }
                ]
            },
            msg: {
                identifier: 'msg',
                rules: [
                    {
                        type: 'empty',
                        prompt: 'Please select fill in your message.'
                    },
                    {
                        type: 'doesntContain[<]',
                        prompt: 'Please enter a Valid Characters.'
                    }
                ]
            },
        }
    });
    if ($('#getTouchForm').form('is valid')) {
        e.preventDefault();
        return 0;
    } else {
        return 4;
    }
}

function getFormData() {
    $form = $('#getTouchForm');
    var formData = $form.form('get values');
    return formData;
}

$('#submitBtn').on('click', function (e) {
    var returnCode = validateForm(e);
    if (returnCode == 4) return;
    else {
        $('#getTouchForm').addClass('loading');
        var formData = getFormData();
        $.ajax({
            url: 'https://ultra-syntax-247615.appspot.com/getInTouch',
            type: 'POST',
            data: JSON.stringify(formData),
            dataType: 'json',
            contentType: 'application/json',
            success: (response) => {
                formatMessageDisplay(response.status, response.message);
                $('#getTouchForm').removeClass('loading');
            },
            error: (jqXHR, textStatus, errorThrown) => {
                formatMessageDisplay(textStatus, errorThrown);
                $('#getTouchForm').removeClass('loading');
            }
        });
    }
});

function formatMessageDisplay(status, message) {
    if (String(status) == "OK") {
        $('#messageHeader').html('<i class="check circle icon"></i> Success !!');
        $('#messageContent').text(`${message}`);
        $('#messageButton').text('OK');
        $('#messageModal').modal({ closable: false }).modal('show');
    } else {
        $('#messageHeader').html('<i class="exclamation triangle icon"></i> Error Occured !!');
        $('#messageContent').text(`${message}`);
        $('#messageButton').text('OK');
        $('#messageModal').modal({ closable: false }).modal('show');
    }
}