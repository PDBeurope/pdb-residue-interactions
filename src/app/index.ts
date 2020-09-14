class PdbResidueInteractionsPlugin { 
    
    apiData: any;
    targetEle: HTMLElement;
    pdbevents: any;
    pdbId: string;
    chainId:string
    
    render(target: HTMLElement, pdbId: string, chainId: string) {
        if(typeof target == 'undefined' || typeof pdbId  == 'undefined') return;
        this.targetEle = <HTMLElement> target;
        this.pdbId = pdbId;
        this.chainId = chainId;
        this.getApiData(pdbId, chainId).then(data => {
            //default pdb events
			this.pdbevents = this.createNewEvent(['PDB.ResidueInteractions.click','PDB.ResidueInteractions.mouseover','PDB.ResidueInteractions.mouseout']);
            this.drawChord(data);
            this.addResourceLink(pdbId);
        });
    }

    createNewEvent = function(eventTypeArr: string[]){
		var eventObj:any = {};
		eventTypeArr.forEach((eventType, index) => {
			var event; 
			if (typeof MouseEvent == 'function') {
				// current standard
				event = new MouseEvent(eventType, { 'view': window, 'bubbles': true, 'cancelable': true });
			
			} else if (typeof document.createEvent == 'function') {
				// older standard
				event = document.createEvent('MouseEvents');
				event.initEvent(eventType, true /*bubbles*/, true /*cancelable*/);
			
			}
			
			eventObj[eventType] = event;
		});
		
		return eventObj;
    }
    
    dispatchEvent(eventType:any, eventData:any, eventElement?:HTMLElement) {
        var dispatchEventElement = this.targetEle;
        if(typeof eventElement !== 'undefined'){
            dispatchEventElement = eventElement;
        }
        if(typeof eventData !== 'undefined'){
            this.pdbevents[eventType]['eventData'] = eventData;
        }
        dispatchEventElement.dispatchEvent(this.pdbevents[eventType])
    }

    addResourceLink(pdbId:string){
        const aWrapEle = document.createElement("div");
        aWrapEle.innerHTML = `<a href="https://www.mrc-lmb.cam.ac.uk/rajini/redirect/${pdbId}" style="border-bottom: none !important; color: #0932d6; text-decoration: none;">View residue interactions <br> in Protein Contacts Atlas</a>`;
        aWrapEle.style.textAlign = 'center';
        aWrapEle.style.marginTop = '10px';
        this.targetEle.append(aWrapEle);
    }

    async getApiData(pdbId: string, chainId?: string) {
        try {
          let url = `https://www.mrc-lmb.cam.ac.uk/rajini/api/${pdbId}`;
          if(typeof chainId != 'undefined') url += `/${chainId}`
          return await (await fetch(url)).json();
        } catch (e) {
          console.log(`Couldn't load PDB-REDO data`, e);
        }
    }

    getData(data:any, check_inter?:number, present?:any){
        let targetGroup:number, sourceGroup:number;
        let matrix = new Array;
        let grouped:any = new Object();
        grouped.links = new Array;
        let targetResidue:number, sourceResidue:number, targetChain, sourceChain, groupsTargetChain, groupsSourceChain;

        for (var i = 0; i < data.links.length; i++){

            if(present && data.links[i].present != present) continue;

            if (check_inter == 1){
                
                targetGroup = -1;
                sourceGroup = -1;

                targetResidue = data.nodes[data.links[i].target].residueNum;
                sourceResidue = data.nodes[data.links[i].source].residueNum;

                for (var j = 0; j < data.groups.length; j++){
                    // First, find each group the target of the interaction is in [it may be in more than one!]
                    if ((targetResidue >= data.groups[j].start) && (targetResidue <= data.groups[j].end)){
                        
                        targetGroup = j;

                        // Then find each group the destination is in
                        for (var k = 0; k < data.groups.length; k++){
                            if ((sourceResidue >= data.groups[k].start) && (sourceResidue <= data.groups[k].end)){
                                sourceGroup = k;
                                // Add the weight of this interaction to the matrix
                                if (!matrix[targetGroup]) matrix[targetGroup] = new Array;
                                if (!matrix[sourceGroup]) matrix[sourceGroup] = new Array;
                                if (!matrix[targetGroup][sourceGroup]) matrix[targetGroup][sourceGroup] = 0;
                                if (!matrix[sourceGroup][targetGroup]) matrix[sourceGroup][targetGroup] = 0;
                                matrix[targetGroup][sourceGroup] += parseInt(data.links[i].value);
                                matrix[sourceGroup][targetGroup] += parseInt(data.links[i].value);
                            }
                        }

                    }
                }
            } else {
                targetGroup = -1;
                sourceGroup = -1;

                targetResidue = data.nodes[data.links[i].target].residueNum;
                sourceResidue = data.nodes[data.links[i].source].residueNum;

                targetChain = data.nodes[data.links[i].target].chain;
                sourceChain = data.nodes[data.links[i].source].chain;

                for (var j = 0; j < data.groups.length; j++){
                    
                    groupsTargetChain = data.groups[j].name[0];
                    // First, find each group the target of the interaction is in [it may be in more than one!]
                    if ((targetResidue >= data.groups[j].start) && (targetResidue <= data.groups[j].end) && groupsTargetChain == targetChain) {
                        targetGroup = j;

                        // Then find each group the destination is in
                        for (var k = 0; k < data.groups.length; k++){
                            groupsSourceChain = data.groups[k].name[0];

                            if ((sourceResidue >= data.groups[k].start) && (sourceResidue <= data.groups[k].end) && groupsSourceChain == sourceChain){
                                sourceGroup = k;
                                // Add the weight of this interaction to the matrix
                                if (!matrix[targetGroup]) matrix[targetGroup] = new Array;
                                if (!matrix[sourceGroup]) matrix[sourceGroup] = new Array;
                                if (!matrix[targetGroup][sourceGroup]) matrix[targetGroup][sourceGroup] = 0;
                                if (!matrix[sourceGroup][targetGroup]) matrix[sourceGroup][targetGroup] = 0;
                                matrix[targetGroup][sourceGroup] += parseInt(data.links[i].value);
                                matrix[sourceGroup][targetGroup] += parseInt(data.links[i].value);

                            }
                        }
                    }
                }

            }
        }

        // fill in zeros due to lack of connections
        for (var i = 0; i < matrix.length; i++)
        {
            for (var j = 0; j < matrix.length; j++)
            {
                if (!matrix[i])
                {
                    matrix[i] = new Object;
                }
                if (!matrix[i][j])
                {
                    matrix[i][j] = 0;
                }
            }
        }
        return matrix;
    }

    drawChord(json:any) {

        let matrixData = this.getData(json);

        //remove connections within domains
        for (let i = 0; i < matrixData.length; i++) {
            //THIS IF CASE ADDED FOR NUCLEIC ACID WITHIN CHAIN DISPLAY, IF ONE CHAIN SELECTED WHICH IS NA, then display by default within structure interaction
            if (json.groupsloops[i].name.indexOf('NucleicAcid') == -1) {
                matrixData[i][i] = 0;
            }
        }

        const chain = json.groups[0].name[0];

        //ORIGINAL SIZE
        var width = 450;
        var r1 = width / 2,
            r0 = r1 - 120;

        const fill = d3.scaleOrdinal(["#3182bd", "#6baed6", "#9ecae1", "#c6dbef", "#e6550d", "#fd8d3c", "#fdae6b", "#e7ba52", "#31a354", "#74c476", "#a1d99b", "#756bb1", "#9467bd", "#9e9ac8", "#bcbddc", "#d62728", "#ff9896"]);
        
        var chord = d3.chord()
            .padAngle(.04)
            .sortSubgroups(d3.descending)
            .sortChords(d3.descending);

        var arc = d3.arc()
            .innerRadius(r0)
            .outerRadius(r0 + 20);

        var svg = d3.select(this.targetEle).append("svg")
            //.attr("id","mysvgID")
            .attr("viewBox", "0 0 350 350")
            .attr("preserveAspectRatio", "xMidYMid meet")
            .datum(chord(matrixData))
            .append("g")
                .attr("transform", "translate(175,175)");

            //interaction data taken from the json file
            //getData function is defined below
            
        var g = svg.selectAll("g.group")
            .data((chords) => { return chords.groups; })
            .enter().append("g")
            .attr("class", "group");

        // add the circular arcs that represent each node
        g.append("svg:path")
            .style("fill", (d) => { return (fill(d.index as any) as string ); })
            .style("stroke", (d) => { return (fill(d.index as any) as string ); })
            .style("cursor", "pointer")
            .attr("d", arc as any)
            .attr("class", "arc")
            .on("mouseover", (d:any, i:number) => { // d contains datum for moused-over item, d the datum for every arc being compared to it
                    svg.selectAll("path.chord").style("opacity", 1.0);
                    let interactingRegions:string[] = [];
                    svg.selectAll("path.chord").filter((d:any) => {
                        
                        if( d.source.index == i){
                            let rangeVal = json.groups[d.target.index].start+'-'+json.groups[d.target.index].end;
                            if(interactingRegions.indexOf(rangeVal) == -1) interactingRegions.push(rangeVal);
                        }

                        if( d.target.index == i){
                            let rangeVal = json.groups[d.source.index].start+'-'+json.groups[d.source.index].end;
                            if(interactingRegions.indexOf(rangeVal) == -1) interactingRegions.push(rangeVal);
                        }

                        if( d.source.index != i && d.target.index != i){
                            return true;
                        }else{
                            return false;
                        }
                    }).transition().style("opacity", 0.1);

                    //Dispatch custom mouseover event
                    this.dispatchEvent('PDB.ResidueInteractions.mouseover', {
                        pdbId: this.pdbId,
                        chainId: this.chainId,
                        interactingRegions: interactingRegions
                    });
            })
            .on("mouseout", (d:any ,i:number) => {
                svg.selectAll("path.chord").transition().style("opacity", 1);
                //Dispatch custom mouseout event
                this.dispatchEvent('PDB.ResidueInteractions.mouseout', {
                    pdbId: this.pdbId,
                    chainId: this.chainId
                });
            })
            .on("click", (d:any, i:number) => {

                svg.selectAll("path.chord").style("opacity", 1.0);
                let interactingRegions:string[] = [];
                svg.selectAll("path.chord").filter((d:any) => {

                    if( d.source.index == i){
                        let rangeVal = json.groups[d.target.index].start+'-'+json.groups[d.target.index].end;
                        if(interactingRegions.indexOf(rangeVal) == -1) interactingRegions.push(rangeVal);
                    }

                    if( d.target.index == i){
                        let rangeVal = json.groups[d.source.index].start+'-'+json.groups[d.source.index].end;
                        if(interactingRegions.indexOf(rangeVal) == -1) interactingRegions.push(rangeVal);
                    }
                    
                    if( d.source.index != i && d.target.index != i){
                        return true;
                    }else{
                        return false;
                    }

                }).transition().style("opacity", 0.1);

                //Dispatch custom click event
                this.dispatchEvent('PDB.ResidueInteractions.click', {
                    pdbId: this.pdbId,
                    chainId: this.chainId,
                    interactingRegions: interactingRegions
                });

            })
            .append("title").text((d:any) => {

                var str = json.groups[d.index].name;
                
                if (str.indexOf('HELIX') > -1) {
                    var str2 = str.replace("HELIX", "H");
                } else if (str.indexOf('SHEET') > -1) {
                    var str2 = str.replace("SHEET", "S");
                } else if (str.indexOf('LOOP') > -1) {
                    var str2 = str.replace("LOOP", "L");
                } else if (str.indexOf('NucleicAcid') > -1) {
                    var str2 = str.replace("NucleicAcid", "NA");
                }

                var strchain = chain + ":";
                str2 = str2.replace(strchain, "");

                return str2 + "(" + json.groups[d.index].start + "-" + json.groups[d.index].end + ")";
            });

        // add the labels for each arc
        g.append("text")
            .each((d) => {
                (d as any).angle = (d.startAngle + d.endAngle) / 2;
            })
            .attr("dy", ".35em")
            .attr("text-anchor", (d:any) => {
                return d.angle > Math.PI ? "end" : null;
            })
            .attr("transform", (d:any) => {
                return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" + "translate(" + (r0 + 26) + ")" + (d.angle > Math.PI ? "rotate(180)" : "");
            })
            .text((d:any) => {

                var str = json.groups[d.index].name;

                if (str.indexOf('HELIX') > -1) {
                    var str2 = str.replace("HELIX", "H");
                } else if (str.indexOf('SHEET') > -1) {
                    var str2 = str.replace("SHEET", "S");
                } else if (str.indexOf('LOOP') > -1) {
                    var str2 = str.replace("LOOP", "L");
                } else if (str.indexOf('NucleicAcid') > -1) {
                    var str2 = str.replace("NucleicAcid", "NA");
                }

                var strchain = chain + ":";
                str2 = str2.replace(strchain, "");
                return str2;

            });

        // add the chords representing each edge
        svg.selectAll("path.chord")
            .data((chords) => { return chords; })
            .enter().append("path")
            .attr("class", "chord")
            .style("stroke", (d:any) => {
                const srcIndex:any = d.source.index;
                return d3.rgb(fill(srcIndex) as any).darker() as any;
            })
            .style("fill", (d:any) => {
                return fill(d.source.index) as any;
            })
            .style("opacity", 1.0)
            .style("cursor", "pointer")
            .attr("d", d3.ribbon().radius(r0) as any)
            .on("mouseover", (d:any, i:number) => {

                    let interactingRegions:string[] = [];
                    svg.selectAll("path.chord").filter((data:any) => {
                       
                        if( data.source.index == i || data.target.index == i){
                            let rangeVal = json.groups[data.source.index].start+'-'+json.groups[data.source.index].end;
                            if(interactingRegions.indexOf(rangeVal) == -1) interactingRegions.push(rangeVal);
                        }

                        if(data.source.index != d.source.index || data.target.index != d.target.index){
                            return true;
                        }else{
                            return false;
                        }

                    }).transition().style("opacity", 0.1);
                    svg.selectAll("path.chord").filter((data:any) => {
                        return data.source.index == d.source.index && data.target.index == d.target.index;
                    }).transition().style("opacity", 1);

                    //Dispatch custom mouseover event
                    this.dispatchEvent('PDB.ResidueInteractions.mouseover', {
                        pdbId: this.pdbId,
                        chainId: this.chainId,
                        interactingRegions: interactingRegions
                    });
                  
            })
            .on("mouseout", (d:any,i:number) => {
                svg.selectAll("path.chord").transition().style("opacity", 1);
                //Dispatch custom mouseover event
                this.dispatchEvent('PDB.ResidueInteractions.mouseout', {
                    pdbId: this.pdbId,
                    chainId: this.chainId
                });
            })
            .on("click", (d:any, i:number) => {

                let interactingRegions:string[] = [];
                svg.selectAll("path.chord").filter((data:any) => {
                   
                    if( data.source.index == i || data.target.index == i){
                        let rangeVal = json.groups[data.source.index].start+'-'+json.groups[data.source.index].end;
                        if(interactingRegions.indexOf(rangeVal) == -1) interactingRegions.push(rangeVal);
                    }

                    if(data.source.index != d.source.index || data.target.index != d.target.index){
                        return true;
                    }else{
                        return false;
                    }

                }).transition().style("opacity", 0.1);
                svg.selectAll("path.chord").filter((data:any) => {
                    return data.source.index == d.source.index && data.target.index == d.target.index;
                }).transition().style("opacity", 1);

                //Dispatch custom mouseover event
                this.dispatchEvent('PDB.ResidueInteractions.click', {
                    pdbId: this.pdbId,
                    chainId: this.chainId,
                    interactingRegions: interactingRegions
                });
              
            })
            .append("title").text(function(d) {
                var source = d.source.index;
                var target = d.target.index;
                return matrixData[source][target] + " atomic contacts."
            });

    }
   

}

(window as any).PdbResidueInteractionsPlugin = PdbResidueInteractionsPlugin;