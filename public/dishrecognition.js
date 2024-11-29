$(document).ready(function() {
    $('#userInfoForm').on('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const height = formData.get('height') / 100;  // convert cm to m
        const weight = formData.get('weight');
        const bmi = weight / (height * height);
        
        $('#bmiValue').text(`Your BMI: ${bmi.toFixed(2)}`);
        let category;
        if (bmi < 18.5) category = 'Underweight';
        else if (bmi < 25) category = 'Normal weight';
        else if (bmi < 30) category = 'Overweight';
        else category = 'Obese';
        $('#bmiCategory').text(`Category: ${category}`);
        
        $('#bmiResult').show();
        $('#imageUploadForm').show();
    });

    $('#imageUploadForm').on('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        
        $.ajax({
            url: '/dishrecognition',
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(data) {
                $('#dishImage').attr('src', URL.createObjectURL(formData.get('image')));
                $('#predictedDish').text(`Predicted Dish: ${data.predicted_dish}`);
                $('#confidence').text(`Confidence: ${data.confidence.toFixed(2)}%`);
                
                // Update nutritional info
                let nutritionalHtml = '<h3>Nutritional Information</h3>';
                for (let [key, value] of Object.entries(data.nutritional_info)) {
                    nutritionalHtml += `<p>${key}: ${value}</p>`;
                }
                $('#nutritionalInfo').html(nutritionalHtml);
                
                // Update similar dishes
                let similarHtml = '<h3>Similar Dishes</h3><ul>';
                data.similar_dishes.forEach(dish => {
                    similarHtml += `<li>${dish}</li>`;
                });
                similarHtml += '</ul>';
                $('#similarDishes').html(similarHtml);
                
                // Update recommendations
                let recHtml = '<h3>Personalized Recommendations</h3><ul>';
                data.recommendations.forEach(dish => {
                    recHtml += `<li>${dish}</li>`;
                });
                recHtml += '</ul>';
                $('#recommendations').html(recHtml);
                
                $('#results').show();
            },
            error: function(error) {
                console.error('Error:', error);
                alert('An error occurred while processing your request.');
            }
        });
    });
});