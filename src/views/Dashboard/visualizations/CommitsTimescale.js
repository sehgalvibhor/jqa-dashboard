import React, { Component } from 'react';
var AppDispatcher = require('../../../AppDispatcher');

import DateRangePicker from 'react-bootstrap-daterangepicker';
// you will need the css that comes with bootstrap@3. if you are using
// a tool like webpack, you can do the following:
import 'bootstrap/dist/css/bootstrap.css';
// you will also need the css that comes with bootstrap-daterangepicker
import 'bootstrap-daterangepicker/daterangepicker.css';
var moment = require('moment');

import {ResponsiveCalendar} from '@nivo/calendar';
import {LegendSvgItem} from '@nivo/legends';

import DashboardAbstract, { neo4jSession, databaseCredentialsProvided } from '../AbstractDashboardComponent';

class CommitsTimescale extends DashboardAbstract {

    constructor(props) {
        super(props);

        var now = new Date();

        this.state = {
            commitsFrom: '2017-01-01',
            commitsTo: '2019-01-01',
            commitsTimescale: []
        };
    }

    componentWillMount() {
      super.componentWillMount();
    }

    componentDidMount() {
      super.componentDidMount();
      if (databaseCredentialsProvided) {
        this.readCommitsTimescale();
      }
    }

    componentWillUnmount() {
      super.componentWillUnmount();
    }

    readCommitsTimescale() {
        var aggregatedData = [];
        var thisBackup = this; //we need this because this is undefined in then() but we want to access the current state

        var minDate = new Date();
        var maxDate = new Date('1970-01-01');

        neo4jSession.run(
            'MATCH (a:Author)-[:COMMITTED]->(c:Commit)-[:CONTAINS_CHANGE]->()-[:MODIFIES]->(f:File), ' +
            '  (c)-[:OF_DAY]->(d)-[:OF_MONTH]->(m)-[:OF_YEAR]->(y) ' +
            'WHERE NOT c:Merge ' +
            'RETURN y.year as year, m.month as month, d.day as day, count(distinct c) as commits, count(f) as files ' +
            'ORDER BY year, month, day  '
        ).then(function (result) {
        result.records.forEach(function (record) {
            var dayString = record.get(0) + "-" + record.get(1) + "-" + record.get(2);

            var current = new Date(dayString);
            if (current.getTime() < minDate.getTime()) {
                minDate = current;
            }
            if (current.getTime() > maxDate.getTime()) {
                maxDate = current;
            }

            var recordConverted = {
                "day": dayString,
                "value": record.get(3).low
            };

            aggregatedData.push(recordConverted);
        });
        }).then( function(context) {
            thisBackup.setState({
                commitsTimescale: aggregatedData,
                commitsFrom: minDate.getFullYear() + "-" + minDate.getMonth() + "-" + minDate.getDate(),
                commitsTo: maxDate.getFullYear() + "-" + maxDate.getMonth() + "-" + maxDate.getDate(),
            });
        }).catch(function (error) {
            console.log(error);
        });
    }

    render() {
        var redirect = super.render();
        if (redirect.length > 0) {
          return(redirect);
        }

        if (this.state.commitsTimescale.length === 0) {
            return '';
        }

        const maxDateDiff = 2;

        var fromDateAr = this.state.commitsFrom.split("-");
        var toDateAr = this.state.commitsTo.split("-");

        var yearDiff = toDateAr[0] - fromDateAr[0];

        var fromDate = this.state.commitsFrom;
        if (yearDiff > maxDateDiff) { //calendar crashes if too many years are displayed because blocksize gets negative
            var newDate = new Date(toDateAr[0] - maxDateDiff, toDateAr[1], toDateAr[2]);
            fromDate = newDate.getFullYear() + "-" + newDate.getMonth() + "-" + newDate.getDate();
        }

        var colors = [
            "#c6e48b",
            "#7bc96f",
            "#239a3b",
            '#192127'
        ];

        var legendItems = [];
        var xPosition = 0;
        for (var i = 0; i < colors.length; i++) {
            xPosition += 20;
            var legendSvgItem = <LegendSvgItem key={i} x={xPosition} y={0} width={20} height={35} label={''} fill={colors[i]} />;
            legendItems.push(legendSvgItem);
        }

        return (
            <div className="calendar-wrapper">
                <DateRangePicker
                    startDate="1/1/2014"
                    endDate="3/1/2019"
                    alwaysShowCalendars
                    minDate="04/30/2018"
                    maxDate="05/06/2018"
                    opens="left"
                    ranges={{
                        'Today': [moment(), moment()],
                        'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
                        'Last 7 Days': [moment().subtract(6, 'days'), moment()],
                        'Last 30 Days': [moment().subtract(29, 'days'), moment()],
                        'This Month': [moment().startOf('month'), moment().endOf('month')],
                        'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
                    }}
                    locale={{
                        "format": "MM/DD/YYYY",
                        "separator": " - ",
                        "applyLabel": "Apply",
                        "cancelLabel": "Cancel",
                        "fromLabel": "From",
                        "toLabel": "To",
                        "customRangeLabel": "Custom",
                        "weekLabel": "W",
                        "daysOfWeek": [
                            "Su",
                            "Mo",
                            "Tu",
                            "We",
                            "Th",
                            "Fr",
                            "Sa"
                        ],
                        "monthNames": [
                            "January",
                            "February",
                            "March",
                            "April",
                            "May",
                            "June",
                            "July",
                            "August",
                            "September",
                            "October",
                            "November",
                            "December"
                        ],
                        "firstDay": 1
                    }}
                    onApply={function(event, picker) {
                        var startDate = picker.minDate["_i"].split('/');
                        var endDate   = picker.maxDate["_i"].split('/');

                        AppDispatcher.handleAction({
                            actionType: 'SET_STATE',
                            data: {
                                commitsFrom: startDate[2] + "-" + startDate[0] + "-" + startDate[1],
                                commitsTo: endDate[2] + "-" + endDate[0] + "-" + endDate[1]
                            }
                        });
//                        console.log(picker);
                    }}
                >
                    <div id="daterange" className="selectbox pull-right float-right">
                        <i className="fa fa-calendar"></i>
                        <span>April 7, 2018 - May 6, 2018</span> <b className="caret"></b>
                    </div>
                </DateRangePicker>
                <div style={{height: "404px", paddingTop: "60px"}}>
                    <ResponsiveCalendar
                        from={fromDate}
                        to={this.state.commitsTo}
                        onClick={ function(event) {
                        console.log(event);
                        /*
                        AppDispatcher.handleAction({
                          actionType: 'SELECT_COMMITSPERAUTHOR',
                          data: event
                        });
                        */
                        }}
                        data={this.state.commitsTimescale}
                        emptyColor="#eeeeee"
                        colors={colors}
                        margin={{
                          "top": 10,
                          "right": 10,
                          "bottom": 10,
                          "left": 30
                        }}
                        yearSpacing={30}
                        monthBorderColor="#ffffff"
                        monthLegendOffset={10}
                        dayBorderWidth={1}
                        dayBorderColor="#ffffff"
                        direction="horizontal"
                    />
                </div>
                <div className="calendar-legend">
                    <div className="less float-left">less</div>
                    <svg id={"dummyLegend"} style={{float: "left", overflow:"visible", width: ((colors.length + 1) * 20) + 16}}>{legendItems}</svg>
                    <div className="more float-left">more</div>
                </div>
            </div>
        )
    }
}

export default CommitsTimescale;
