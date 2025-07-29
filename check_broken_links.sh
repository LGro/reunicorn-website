#!/bin/bash
wget --spider -r -nd -nv -H -l 1 -w 1 -o /tmp/reunicorn_broken_links.log $1

BROKEN=$(grep -B1 'broken link!' /tmp/reunicorn_broken_links.log)

if [ -z "$BROKEN" ]; then
    echo "Success! No broken links detected."
    exit 0
else
    echo "Broken links detected..."
    echo $BROKEN
    exit 1
fi
