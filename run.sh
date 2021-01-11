if ! command -v node &> /dev/null
then
    echo "NodeJS not install. Install it and run the script again"
    exit
fi
node index.js
