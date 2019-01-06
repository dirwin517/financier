angular.module('app', [])

    .controller('Financier', function($scope) {

        $scope.rows = [
            {
                name : 'paycheck',
                cost : -2500,
                frequency : 'biweekly',
                start : new Date('01/01/2019'),
                end : new Date('12/31/2019')
            },
            {
                name : 'rent',
                cost : 1005,
                frequency : 'monthly',
                start :new Date( '01/01/2019'),
                end : new Date('12/31/2019')
            }
        ];

        $scope.addRow = function(){
            $scope.rows.push({
                name : 'Unknown',
                cost : 0,
                frequency : 'monthly',
                start : new Date('01/01/2019'),
                end : new Date('12/31/2019')
            });
        };

        $scope.removeRow = function (rowIndex) {
          console.log('rowIndex', rowIndex);
          $scope.rows.splice(rowIndex, 1);
        };

        function handleFileSelect(evt) {
            let files = evt.target.files[0]; // FileList object
            let reader = new FileReader();

            reader.onload = function(e) {
                console.log('e', e.target.result);

                let results = JSON.parse(atob(e.target.result.replace('data:application/json;base64,', '')));
                while($scope.rows.length > 0) {
                    $scope.rows.pop();
                }
                results
                    .filter(row => row.name !== 'Unknown' && row.start && row.end && row.cost)
                    .forEach((row) => {
                    $scope.rows.push({
                        name : row.name,
                        cost : row.cost,
                        frequency : row.frequency,
                        start : new Date(row.start),
                        end : new Date(row.end)
                    });
                })

                $scope.$apply();
            };

            reader.readAsDataURL(files);
        }

        document.getElementById('file').addEventListener('change', handleFileSelect, false);

        $scope.freq = function (date, str) {
            switch(str) {
                case 'hourly' :
                    return moment(date).add(1, 'hours');
                case 'daily' :
                    return moment(date).add(1, 'days');
                case 'weekly' :
                    return moment(date).add(7, 'days');
                case 'biweekly' :
                    return moment(date).add(14, 'days');
                case 'monthly' :
                    return moment(date).add(1, 'months');
                case 'biannually' :
                    return moment(date).add(6, 'months');
                case 'yearly' :
                    return moment(date).add(1, 'years');
            }
        };

        $scope.reDraw = function reDraw() {

            //Get the file contents
            let rows = JSON.parse(angular.toJson($scope.rows));


            console.log('ROWS', rows);

            if(rows.length === 0) {
                return;
            }

            document.getElementById('link').href = 'data:application/json;charset=utf-8,'+ encodeURIComponent(JSON.stringify(rows, (key, val) => {
                if(['start','end'].includes(key)) {
                    return moment(val).toISOString();
                }
                return val;
            }));

            let rowStats = rows.reduce((acc, row) => {
                if(row && row.start && row.end) {
                    if (moment(row.start).isBefore(acc.start)) {
                        acc.start = moment(row.start).unix()*1000;
                    }
                    if (moment(row.end).isAfter(acc.end)) {
                        acc.end = moment(row.end).unix()*1000;
                    }
                }
                else {
                    console.log('row', row)
                }
                return acc;
            }, {
                start : 999999999999999,
                end : 0
            });

            let rangeInMilliseconds = (rowStats.end-rowStats.start);
            let rangeInHours = rangeInMilliseconds / 1000 / 60 / 60;

            console.log('rowStats', rowStats, 'rangeInMilliseconds', rangeInMilliseconds, 'rangeInHours', rangeInHours);

            let timer = moment(rowStats.start);

            let mostGranularTime = new Array(Math.ceil(rangeInHours)).fill([]).map(() => {
                return [
                    (timer.add('hours', 1)).unix()*1000,//each readings is an hour later
                    0
                ];
            });

            let series = rows.filter(row=>row.name !== 'Unknown' && row.start && row.end).reduce((acc, row) => {

                let summary = acc.find((seri) => seri.name === 'summary');

                let time = moment(row.start);

                let readings = JSON.parse(JSON.stringify(mostGranularTime));//start off here

                while(time.isBefore(row.end)) {

                    time = $scope.freq(time, row.frequency);

                    readings = readings.map(([ts, v]) => {

                        let nv = parseFloat(v+'');
                        if(ts/1000 >= time.unix()) {
                            nv -= row.cost;
                        }

                        return [ts, nv];
                    });

                    summary.data = summary.data.map(([ts, v]) => {

                        let nv = v;
                        if(ts/1000 >= time.unix()) {
                            nv -= row.cost;
                        }

                        return [ts, nv];
                    });

                }

                let seri = acc.find((seri) => seri.name === row.name);

                if(!seri) {
                    seri = {
                        type: 'line',
                        name: row.name,
                        data : readings
                    };
                    acc.push(seri);
                }
                // else {
                //     seri.data = seri.data.join(readings);
                // }

                return acc;
            }, [{
                type : 'line',
                name : 'summary',
                data : JSON.parse(JSON.stringify(mostGranularTime))
            }]);

            console.log('data', series);

            Highcharts.chart('container', {
                chart: {
                    zoomType: 'x'
                },
                title: {
                    text: 'Budget Over Time'
                },
                xAxis: {
                    type: 'datetime'
                },
                yAxis: {
                    title: {
                        text: '$'
                    }
                },
                legend: {
                    enabled: true
                },
                plotOptions: {
                },

                series: series
            });
        }

        $scope.$watchCollection('rows', $scope.reDraw, true);

    });