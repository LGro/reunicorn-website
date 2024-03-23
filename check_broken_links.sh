#!/bin/bash
wget --spider -r -nd -nv -H -l 1 -w 1 -o /tmp/coagulate_broken_links.log $1

BROKEN=$(egrep -B1 'broken link!|ERROR' /tmp/coagulate_broken_links.log)

if [ -z "$BROKEN" ]; then
    echo "Success! No broken links detected."
    exit 0
else
    echo "Broken links detected..."
    echo $BROKEN
    exit 1
fi
